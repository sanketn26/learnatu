-- Courses uploaded as zip files. Each upload is a numbered version of a course:
--   draft -> (previewed by authors) -> published -> archived when a newer version is published.
-- Courses written in git (content/courses/) are not stored here.
CREATE TABLE course_versions (
  id TEXT PRIMARY KEY,
  course TEXT NOT NULL,           -- course slug (the folder name)
  version INTEGER NOT NULL,       -- 1, 2, 3 ... per course
  status TEXT NOT NULL,           -- 'draft' | 'published' | 'archived'
  settings TEXT NOT NULL,         -- JSON of course.md settings
  about_html TEXT NOT NULL,       -- rendered body of course.md
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE UNIQUE INDEX course_versions_number ON course_versions(course, version);
-- At most one published version per course.
CREATE UNIQUE INDEX course_versions_one_published ON course_versions(course) WHERE status = 'published';

CREATE TABLE course_lessons (
  version_id TEXT NOT NULL REFERENCES course_versions(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,             -- 'en' | 'hi'
  slug TEXT NOT NULL,
  settings TEXT NOT NULL,         -- JSON of the lesson's settings (title, minutes, objectives, ...)
  html TEXT NOT NULL,             -- rendered lesson body
  PRIMARY KEY (version_id, lang, slug)
);

CREATE TABLE course_assets (
  version_id TEXT NOT NULL REFERENCES course_versions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,             -- e.g. images/chart.png
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (version_id, path)
);
