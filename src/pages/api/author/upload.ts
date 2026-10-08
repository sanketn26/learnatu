import { getEntry } from 'astro:content';
import { authorApi } from '../../../lib/auth/author-api';
import { HttpError, json } from '../../../lib/http';
import { categorySlugs } from '../../../data/categories';
import { checkPackage, COURSE_SLUG } from '../../../lib/packages/check.mjs';
import { readZip } from '../../../lib/packages/unzip.mjs';
import { renderMarkdown } from '../../../lib/packages/render.mjs';
import { slugFromName } from '../../../lib/packages/slug';
import { createDraftVersion } from '../../../lib/db/course-versions';

export const prerender = false;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type Problem = { where: string; message: string };

/**
 * Upload a course zip. Checks it, renders every lesson, and saves it as the next DRAFT version of the course.
 * Nothing becomes visible to learners until an author publishes the version.
 * Answers { ok: false, errors, warnings } (nothing saved) or { ok: true, course, version, versionId, warnings }.
 */
export const POST = authorApi(async ({ request }, user) => {
  // Refuse before reading the body when the browser already says it is too big (the file itself is checked below).
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError(413, 'That zip is larger than 15 MB.');
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a .zip file to upload.');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(400, 'That zip is larger than 15 MB.');

  const zip = readZip(new Uint8Array(await file.arrayBuffer()));
  const slug = slugFromName(String(form?.get('slug') || zip.rootName || file.name));
  const errors: Problem[] = [...zip.errors];
  const warnings: Problem[] = [...zip.warnings];
  const fail = () => json({ ok: false, errors, warnings });

  if (!COURSE_SLUG.test(slug)) {
    errors.push({ where: 'course name', message: 'Use lowercase words joined by hyphens (for example money-basics).' });
    return fail();
  }
  if (await getEntry('courseMeta', `${slug}/course`)) {
    errors.push({ where: 'course name', message: `"${slug}" is already a course in the website's own files. Choose another folder name.` });
    return fail();
  }

  const checked = checkPackage({ files: zip.files, assets: new Set(zip.assets.keys()), categories: categorySlugs });
  errors.push(...checked.errors);
  warnings.push(...checked.warnings);
  if (!checked.course) return fail();

  const assetPaths = new Set(zip.assets.keys());
  const lessons = [];
  for (const lesson of checked.course.lessons) {
    const where = `${lesson.lang}/${lesson.slug}.md`;
    try {
      lessons.push({ lang: lesson.lang, slug: lesson.slug, settings: lesson.data, html: await renderMarkdown(lesson.body, { slug, fromPath: where, assets: assetPaths }) });
    } catch (e) {
      errors.push({ where, message: (e as Error).message.replace(/^.*?: /, '') });
    }
  }
  if (errors.length) return fail();

  const aboutHtml = await renderMarkdown(checked.course.about, { slug, fromPath: 'course.md', assets: assetPaths });
  const saved = await createDraftVersion({
    course: slug, userId: user.id, settings: checked.course.settings, aboutHtml, lessons,
    assets: [...zip.assets].map(([path, asset]) => ({ path, contentType: asset.contentType, data: asset.data }))
  });
  return json({ ok: true, course: slug, version: saved.version, versionId: saved.id, warnings });
});
