import type { APIRoute } from 'astro';
import { isAuthor } from '../../lib/auth/roles';
import { getAsset, getPublishedVersion, getVersion } from '../../lib/db/course-versions';
import { PREVIEW_COOKIE, previewVersionFor } from '../../lib/courses/preview';

export const prerender = false;

/** Images from uploaded courses: /media/<course>/<path inside the zip>. Authors previewing a draft see that draft's images. */
export const GET: APIRoute = async ({ params, cookies, locals }) => {
  const [slug, ...rest] = (params.path ?? '').split('/');
  if (!slug || !rest.length) return new Response('Not found', { status: 404 });

  const previewId = previewVersionFor(cookies.get(PREVIEW_COOKIE)?.value, slug);
  const previewing = previewId && isAuthor(await locals.getUser()) ? await getVersion(previewId) : null;
  const version = previewing?.course === slug ? previewing : await getPublishedVersion(slug);
  const asset = version ? await getAsset(version.id, rest.join('/')) : null;
  if (!asset) return new Response('Not found', { status: 404 });

  return new Response(asset.data, {
    headers: { 'content-type': asset.content_type, 'x-content-type-options': 'nosniff', 'cache-control': previewing ? 'private, no-store' : 'public, max-age=3600' }
  });
};
