import { unzipSync, strFromU8 } from 'fflate';

/**
 * Reads an uploaded course zip into { files, assets } for checkPackage, with safety limits.
 * Pure (bytes in, data out). Everything it refuses is reported in `errors` so the author can fix it.
 */
export const LIMITS = {
  maxFiles: 300,
  maxTotalBytes: 20 * 1024 * 1024, // all files, after unpacking
  maxTextBytes: 512 * 1024,        // one Markdown file
  maxImageBytes: 1024 * 1024       // one image
};

const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/** Cleans a path from inside a zip. Returns null for paths we never want (Mac junk, hidden files, directories). */
function cleanPath(raw) {
  const path = raw.replace(/\\/g, '/');
  if (path.endsWith('/') || path.startsWith('__MACOSX/')) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts.some((part) => part.startsWith('.'))) return null;
  return parts.join('/');
}

export function readZip(bytes, limits = LIMITS) {
  const errors = [];
  const warnings = [];
  let entries;
  try {
    let total = 0;
    let count = 0;
    entries = unzipSync(bytes, {
      filter: (file) => {
        if (file.name.endsWith('/')) return false;
        if (++count > limits.maxFiles) throw new Error(`The zip has more than ${limits.maxFiles} files.`);
        total += file.originalSize;
        if (total > limits.maxTotalBytes) throw new Error(`The zip is larger than ${Math.round(limits.maxTotalBytes / 1048576)} MB once unpacked.`);
        return true;
      }
    });
  } catch (e) {
    const known = /^The zip/.test(e.message);
    return { files: new Map(), assets: new Map(), rootName: null, errors: [{ where: 'zip', message: known ? e.message : 'This is not a valid zip file.' }], warnings };
  }

  const cleaned = [];
  for (const [name, data] of Object.entries(entries)) {
    const path = cleanPath(name);
    if (path === null) continue;
    if (path.split('/').includes('..') || path.startsWith('/')) { errors.push({ where: name, message: 'has an unsafe path' }); continue; }
    cleaned.push([path, data]);
  }

  // A zip made by right-clicking a folder has everything inside one top folder: use it as the course folder.
  let rootName = null;
  const firstParts = new Set(cleaned.map(([path]) => path.split('/')[0]));
  const hasRootCourseFile = cleaned.some(([path]) => path === 'course.md');
  if (!hasRootCourseFile && firstParts.size === 1 && cleaned.every(([path]) => path.includes('/'))) {
    rootName = [...firstParts][0];
  }

  const files = new Map();
  const assets = new Map();
  for (const [fullPath, data] of cleaned) {
    const path = rootName ? fullPath.slice(rootName.length + 1) : fullPath;
    const extension = path.split('.').pop().toLowerCase();
    if (extension === 'md') {
      if (data.length > limits.maxTextBytes) { errors.push({ where: path, message: `is larger than ${Math.round(limits.maxTextBytes / 1024)} KB` }); continue; }
      files.set(path, strFromU8(data));
    } else if (IMAGE_TYPES[extension]) {
      if (data.length > limits.maxImageBytes) { errors.push({ where: path, message: `is larger than ${Math.round(limits.maxImageBytes / 1048576)} MB. Compress the image.` }); continue; }
      assets.set(path, { contentType: IMAGE_TYPES[extension], data });
    } else {
      warnings.push({ where: path, message: 'is ignored (only .md files and png, jpg, gif or webp images are used)' });
    }
  }
  return { files, assets, rootName, errors, warnings };
}
