import { env } from 'cloudflare:workers';
import type { User } from '../db/users';

/** Authors are the emails listed in ADMIN_EMAILS (comma-separated). They get preview mode. */
export function isAuthor(user: User | null) {
  if (!user || !env.ADMIN_EMAILS) return false;
  return env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase()).includes(user.email.toLowerCase());
}
