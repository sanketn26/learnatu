import { db, now } from './client';

export type User = { id: string; email: string; name: string | null; picture: string | null };

export async function upsertGoogleUser(profile: { sub: string; email: string; name?: string; picture?: string }): Promise<User> {
  const existing = await db().prepare('SELECT id FROM users WHERE google_sub = ?').bind(profile.sub).first<{ id: string }>();
  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    await db().prepare('UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?')
      .bind(profile.email, profile.name ?? null, profile.picture ?? null, id).run();
  } else {
    await db().prepare('INSERT INTO users (id, google_sub, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, profile.sub, profile.email, profile.name ?? null, profile.picture ?? null, now()).run();
  }
  return { id, email: profile.email, name: profile.name ?? null, picture: profile.picture ?? null };
}
