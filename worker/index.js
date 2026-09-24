/* Contractor Arsenal Worker.
   The site itself is static files served by Workers Static Assets (wrangler.jsonc
   "assets"). run_worker_first limits this script to /api/*, so every page, image,
   and stylesheet is still served straight from assets without invoking it. */
import { handleSubscribe } from './newsletter.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/newsletter/subscribe') return handleSubscribe(request, env);
    return env.ASSETS.fetch(request);
  },
};
