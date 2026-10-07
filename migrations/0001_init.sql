CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,            -- sha-256 of the cookie token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE enrollments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  source TEXT NOT NULL,           -- 'free' | 'razorpay' | 'stripe' | 'grant'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course)
);

CREATE TABLE progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  lesson TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course, lesson)
);

CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  lesson TEXT NOT NULL,
  quiz TEXT NOT NULL,
  correct INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX quiz_attempts_lookup ON quiz_attempts(user_id, course, lesson);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  provider TEXT NOT NULL,         -- 'razorpay' | 'stripe'
  provider_ref TEXT NOT NULL,     -- razorpay order id / stripe checkout session id
  amount INTEGER NOT NULL,        -- minor units (paise / cents)
  currency TEXT NOT NULL,
  status TEXT NOT NULL,           -- 'created' | 'paid' | 'failed'
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX orders_provider_ref ON orders(provider, provider_ref);
