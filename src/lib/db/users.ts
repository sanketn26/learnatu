import { db, now } from './client';

export type User = { id: string; email: string; name: string | null; picture: string | null };

export async function upsertGoogleUser(profile: { sub: string; email: string; name?: string; picture?: string }): Promise<User> {
  // One statement, so two simultaneous first sign-ins cannot collide on the unique google_sub.
  const row = await db().prepare(
    `INSERT INTO users (id, google_sub, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture
     RETURNING id`
  ).bind(crypto.randomUUID(), profile.sub, profile.email, profile.name ?? null, profile.picture ?? null, now()).first<{ id: string }>();
  if (!row) throw new Error('Could not save the user');
  return { id: row.id, email: profile.email, name: profile.name ?? null, picture: profile.picture ?? null };
}
