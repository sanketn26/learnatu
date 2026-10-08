/// <reference path="../.astro/types.d.ts" />

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}

declare namespace Cloudflare {
  interface Env {
    DB: import('@cloudflare/workers-types').D1Database;
    /** Comma-separated emails allowed to preview drafts and paid lessons (see /author/). */
    ADMIN_EMAILS?: string;
    SITE_URL: string;
    DEBUG?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  }
}

declare namespace App {
  interface Locals {
    /** Resolves the signed-in user (cached per request); null when anonymous. */
    getUser(): Promise<import('./lib/db/users').User | null>;
    requestId: string;
    /** The reader's language (from the `lang` cookie); unset on prerendered pages, where English applies. */
    lang?: import('./i18n/locales').Locale;
  }
}
