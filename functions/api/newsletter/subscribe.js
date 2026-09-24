/* POST /api/newsletter/subscribe
   Cloudflare Pages Function. Creates (or refreshes) a Resend Contact for the
   Contractor Arsenal Report. The Resend key lives only in the server-side
   environment (RESEND_API_KEY) and never reaches the browser.

   Environment:
     RESEND_API_KEY           required, secret
     RESEND_SEGMENT_ID        optional, adds new contacts to this Resend segment
     RESEND_SOURCE_PROPERTY   optional, name of a custom contact property that
                              already exists in Resend (e.g. "source"); when set,
                              the signup source is stored there

   Accepts JSON (from newsletter.js) or a plain form post (no-JS fallback,
   answered with a redirect back to the page). */

const RESEND_API = 'https://api.resend.com';
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const ALLOWED_SOURCES = ['website-popup', 'website-footer'];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
}

async function readBody(request) {
  const type = request.headers.get('Content-Type') || '';
  if (type.includes('application/json')) {
    return { data: await request.json(), isForm: false };
  }
  const form = await request.formData();
  return { data: Object.fromEntries(form), isForm: true };
}

async function resend(env, method, path, body) {
  return fetch(RESEND_API + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/* Create the contact; if Resend rejects it (most commonly because the email
   already exists), update the existing contact by email instead so a repeat
   signup still ends in a clean success. */
async function upsertContact(env, contact) {
  const create = { email: contact.email, unsubscribed: false };
  if (contact.firstName) create.first_name = contact.firstName;
  if (env.RESEND_SEGMENT_ID) create.segments = [env.RESEND_SEGMENT_ID];
  if (env.RESEND_SOURCE_PROPERTY) create.properties = { [env.RESEND_SOURCE_PROPERTY]: contact.source };

  const created = await resend(env, 'POST', '/contacts', create);
  if (created.ok) return true;
  const createStatus = created.status;
  const createDetail = await created.text();

  const update = { unsubscribed: false };
  if (contact.firstName) update.first_name = contact.firstName;
  const updated = await resend(env, 'PATCH', '/contacts/' + encodeURIComponent(contact.email), update);
  if (updated.ok) return true;

  // Server-side log only; never sent to the browser.
  console.error('Resend contact upsert failed', createStatus, createDetail.slice(0, 300), updated.status);
  return false;
}

function backTo(request, status) {
  const ref = request.headers.get('Referer');
  const url = new URL(ref && new URL(ref).origin === new URL(request.url).origin ? ref : '/', request.url);
  url.searchParams.set('newsletter', status);
  url.hash = 'newsletter';
  return Response.redirect(url.toString(), 303);
}

export async function onRequestPost({ request, env }) {
  let parsed;
  try {
    parsed = await readBody(request);
  } catch (e) {
    return json(400, { ok: false, error: 'Something went wrong. Please try again.' });
  }
  const { data, isForm } = parsed;
  const reply = (status, body, formStatus) => (isForm ? backTo(request, formStatus) : json(status, body));

  // Honeypot: real visitors never see or fill this field.
  if (clean(data.company_website, 200)) return reply(200, { ok: true }, 'success');

  const email = clean(data.email, 254).toLowerCase();
  const firstName = clean(data.firstName, 60);
  const source = ALLOWED_SOURCES.includes(data.source) ? data.source : 'website-popup';

  if (!email || !EMAIL_RE.test(email)) {
    return reply(422, { ok: false, error: 'Enter a valid email address.' }, 'invalid');
  }
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return reply(503, { ok: false, error: 'Signup is temporarily unavailable. Please try again later.' }, 'error');
  }

  let ok = false;
  try {
    ok = await upsertContact(env, { email, firstName, source });
  } catch (e) {
    console.error('Resend request error', e && e.message);
  }
  if (!ok) {
    return reply(502, { ok: false, error: "We couldn't add you right now. Please try again in a minute." }, 'error');
  }
  return reply(200, { ok: true }, 'success');
}

export function onRequest() {
  return json(405, { ok: false, error: 'Method not allowed.' });
}
