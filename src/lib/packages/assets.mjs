import path from 'node:path';

/** Finds the asset a Markdown image link points to: relative to the lesson's folder, or to the course folder. */
export function resolveAsset(ref, fromPath, assets) {
  const fromLesson = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), ref));
  if (assets.has(fromLesson)) return fromLesson;
  const fromRoot = path.posix.normalize(ref);
  return assets.has(fromRoot) ? fromRoot : null;
}
