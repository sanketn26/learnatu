import { db, now } from './client';

/** 'uploading' is a version whose rows are still being written; it is invisible everywhere until it flips to 'draft'. */
export type VersionStatus = 'uploading' | 'draft' | 'published' | 'archived';
export type VersionRow = { id: string; course: string; version: number; status: VersionStatus; settings: string; about_html: string; uploaded_by: string; created_at: number; published_at: number | null };
export type LessonRow = { lang: string; slug: string; settings: string; html: string };
export type NewVersion = {
  course: string; userId: string; settings: unknown; aboutHtml: string;
  lessons: { lang: string; slug: string; settings: unknown; html: string }[];
  assets: { path: string; contentType: string; data: Uint8Array }[];
};

const BATCH = 40; // statements per D1 batch

const isUniqueViolation = (error: unknown) => /UNIQUE constraint/i.test(String((error as Error)?.message));

/**
 * Saves an upload as the next draft version of its course. Returns the new version's id and number.
 * The version row starts as 'uploading' and only becomes a 'draft' in the last statement, so a crash part-way
 * leaves nothing a learner or an author can see or publish. Two uploads at once get different numbers (one retries).
 */
export async function createDraftVersion(input: NewVersion) {
  for (let attempt = 0; ; attempt++) {
    const id = crypto.randomUUID();
    const last = await db().prepare('SELECT MAX(version) AS v FROM course_versions WHERE course = ?').bind(input.course).first<{ v: number | null }>();
    const version = (last?.v ?? 0) + 1;
    try {
      await db().prepare('INSERT INTO course_versions (id, course, version, status, settings, about_html, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, input.course, version, 'uploading', JSON.stringify(input.settings), input.aboutHtml, input.userId, now()).run();
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 4) continue; // another upload took this number
      throw error;
    }
    const statements = [
      ...input.lessons.map((l) => db().prepare('INSERT INTO course_lessons (version_id, lang, slug, settings, html) VALUES (?, ?, ?, ?, ?)')
        .bind(id, l.lang, l.slug, JSON.stringify(l.settings), l.html)),
      ...input.assets.map((a) => db().prepare('INSERT INTO course_assets (version_id, path, content_type, data) VALUES (?, ?, ?, ?)')
        .bind(id, a.path, a.contentType, a.data.buffer.slice(a.data.byteOffset, a.data.byteOffset + a.data.byteLength)))
    ];
    try {
      for (let i = 0; i < statements.length; i += BATCH) await db().batch(statements.slice(i, i + BATCH));
      await db().prepare("UPDATE course_versions SET status = 'draft' WHERE id = ?").bind(id).run();
    } catch (error) {
      await db().prepare('DELETE FROM course_versions WHERE id = ?').bind(id).run().catch(() => {}); // cascades; if even this fails the row stays hidden as 'uploading'
      throw error;
    }
    return { id, version };
  }
}

export const getVersion = (id: string) => db().prepare("SELECT * FROM course_versions WHERE id = ? AND status != 'uploading'").bind(id).first<VersionRow>();

export const getPublishedVersion = (course: string) =>
  db().prepare("SELECT * FROM course_versions WHERE course = ? AND status = 'published'").bind(course).first<VersionRow>();

export async function listPublishedVersions() {
  const { results } = await db().prepare("SELECT * FROM course_versions WHERE status = 'published'").all<VersionRow>();
  return results;
}

/** Every version of every uploaded course, newest first (the author page). */
export async function listAllVersions() {
  const { results } = await db().prepare("SELECT * FROM course_versions WHERE status != 'uploading' ORDER BY course, version DESC").all<VersionRow>();
  return results;
}

export async function listLessons(versionId: string) {
  const { results } = await db().prepare('SELECT lang, slug, settings, html FROM course_lessons WHERE version_id = ?').bind(versionId).all<LessonRow>();
  return results;
}

export const getLesson = (versionId: string, lang: string, slug: string) =>
  db().prepare('SELECT lang, slug, settings, html FROM course_lessons WHERE version_id = ? AND lang = ? AND slug = ?').bind(versionId, lang, slug).first<LessonRow>();

export const getAsset = (versionId: string, path: string) =>
  db().prepare('SELECT content_type, data FROM course_assets WHERE version_id = ? AND path = ?').bind(versionId, path).first<{ content_type: string; data: ArrayBuffer }>();

/** Makes a version the live one. The previous live version is archived in the same step (a roll back is just publishing an older version). */
export async function publishVersion(id: string) {
  const version = await getVersion(id); // never returns a half-written upload
  if (!version) return false;
  await db().batch([
    db().prepare("UPDATE course_versions SET status = 'archived' WHERE course = ? AND status = 'published' AND id != ?").bind(version.course, id),
    db().prepare("UPDATE course_versions SET status = 'published', published_at = ? WHERE id = ?").bind(now(), id)
  ]);
  return true;
}

/** Drafts can be deleted; published and archived versions are kept. */
export async function deleteDraft(id: string) {
  const result = await db().prepare("DELETE FROM course_versions WHERE id = ? AND status = 'draft'").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
