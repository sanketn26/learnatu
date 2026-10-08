import { sha256Hex } from '../crypto';
import { db, now } from './client';
import type { User } from './users';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function createSession(userId: string, token: string) {
  await db().prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now()).run(); // expired rows are never read again
  await db().prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, now() + SESSION_TTL_SECONDS).run();
}

export async function findUserBySession(token: string): Promise<User | null> {
  return db().prepare(
    `SELECT u.id, u.email, u.name, u.picture FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`
  ).bind(await sha256Hex(token), now()).first<User>();
}

export async function deleteSession(token: string) {
  await db().prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
}

/** "Sign out everywhere": removes every session of the user. */
export async function deleteUserSessions(userId: string) {
  await db().prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}
