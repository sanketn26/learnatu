import { env } from 'cloudflare:workers';

/** The single entry point to D1. Every query module imports `db()` from here. */
export const db = () => env.DB;
export const now = () => Math.floor(Date.now() / 1000);
