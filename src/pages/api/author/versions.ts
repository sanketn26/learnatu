import { authorApi } from '../../../lib/auth/author-api';
import { HttpError, json, readJson } from '../../../lib/http';
import { getEntry } from 'astro:content';
import { deleteDraft, getVersion, publishVersion } from '../../../lib/db/course-versions';

export const prerender = false;

/** Publish a version (this is also how you roll back to an older one), or delete a draft. */
export const POST = authorApi(async ({ request }) => {
  const { action, versionId } = await readJson<{ action: 'publish' | 'delete'; versionId: string }>(request);
  if (action === 'publish') {
    const version = await getVersion(versionId);
    // A course in the website's own files wins over an upload with the same name, so publishing would show nothing.
    if (version && (await getEntry('courseMeta', `${version.course}/course`))) throw new HttpError(409, `"${version.course}" is now a course in the website's own files. Rename the upload's folder and upload again.`);
    if (!(await publishVersion(versionId))) throw new HttpError(404, 'Unknown version');
  } else if (action === 'delete') {
    if (!(await deleteDraft(versionId))) throw new HttpError(400, 'Only drafts can be deleted');
  } else {
    throw new HttpError(400, 'Unknown action');
  }
  return json({ ok: true });
});
