import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { chanceLabel } from '@nordlys/shared';
import {
  confirm,
  emailSubs,
  tokenMatches,
  unsubscribe,
  updatePrefs,
  type EmailSub,
} from '../services/email/subscribers';
import { trackEvent } from '../telemetry';

type Lang = 'nb' | 'en';
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const W = {
  nb: {
    home: 'Til forsiden',
    invalid: 'Lenken er ugyldig eller utløpt',
    invalidBody:
      'Varselet finnes ikke lenger, eller lenken er ufullstendig. Du kan melde deg på igjen fra forsiden.',
    confirmTitle: 'Bekreft nordlysvarsel',
    confirmBody: 'Trykk på knappen for å starte varsler på e-post for {place}.',
    confirmButton: 'Bekreft',
    confirmedTitle: 'Varselet er på',
    confirmedBody:
      'Du får en e-post dagen før en god sjanse for nordlys over {place}, vanligvis mellom kl. 15 og 21. Høyst én per natt.',
    manageTitle: 'Innstillinger for nordlysvarsel',
    manageFor: 'Varsel for {place} til {email}',
    dayBefore: 'Dagen før en god sjanse (anbefalt)',
    minHigh: 'Bare når sjansen er stor',
    now: '«Det skjer nå»-varsel når det er mørkt, klart og aktivt (høyst én per natt, ikke 02–06)',
    language: 'Språk',
    save: 'Lagre',
    saved: 'Lagret.',
    unsubscribeButton: 'Avslutt alle varsler for dette stedet',
    unsubTitle: 'Avmelder …',
    unsubNoscript: 'Trykk for å avslutte varslene.',
    unsubbedTitle: 'Du er avmeldt',
    unsubbedBody:
      'Du får ikke flere nordlysvarsler for {place}. Adressen din er slettet fra listen.',
    resubscribe: 'Meld deg på igjen',
    changePlace:
      'Vil du bytte sted? Meld deg på for det nye stedet fra forsiden, og avslutt dette.',
  },
  en: {
    home: 'Back to the forecast',
    invalid: 'This link is invalid or has expired',
    invalidBody:
      'The alert no longer exists, or the link is incomplete. You can sign up again from the front page.',
    confirmTitle: 'Confirm aurora alerts',
    confirmBody: 'Press the button to start e-mail alerts for {place}.',
    confirmButton: 'Confirm',
    confirmedTitle: 'Alerts are on',
    confirmedBody:
      "You'll get an e-mail the day before a good chance of aurora over {place}, usually between 15:00 and 21:00 Norwegian time. At most one per night.",
    manageTitle: 'Aurora alert settings',
    manageFor: 'Alerts for {place} to {email}',
    dayBefore: 'The day before a good chance (recommended)',
    minHigh: 'Only when the chance is high',
    now: '"Happening now" alert when it is dark, clear and active (at most one per night, not 02–06)',
    language: 'Language',
    save: 'Save',
    saved: 'Saved.',
    unsubscribeButton: 'Stop all alerts for this place',
    unsubTitle: 'Unsubscribing …',
    unsubNoscript: 'Press to stop the alerts.',
    unsubbedTitle: "You're unsubscribed",
    unsubbedBody:
      "You won't get more aurora alerts for {place}. Your address has been deleted from the list.",
    resubscribe: 'Sign up again',
    changePlace:
      'Want another place? Sign up for the new place from the front page, then stop this one.',
  },
} as const;

const fill = (s: string, v: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => esc(v[k] ?? ''));

function page(reply: FastifyReply, lang: Lang, title: string, body: string, status = 200) {
  const home = lang === 'en' ? '/?lang=en' : '/';
  return reply
    .code(status)
    .header('cache-control', 'no-store')
    .header('referrer-policy', 'no-referrer')
    .header('x-robots-tag', 'noindex')
    .type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · Nordlys i natt?</title>
<link rel="icon" href="/favicon.svg">
<style>
:root{color-scheme:dark;--bg:#0b1020;--fg:#e9eefc;--muted:#a8b3d1;--accent:#5fe0a8;--card:#141b31}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:560px;margin:0 auto;padding:40px 20px}h1{font-size:1.6rem;line-height:1.25;margin:0 0 12px}
p{margin:0 0 14px}.muted{color:var(--muted);font-size:.95rem}.card{background:var(--card);border-radius:12px;padding:20px;margin:20px 0}
button,.btn{display:inline-block;background:var(--accent);color:#06281b;border:0;border-radius:8px;padding:12px 18px;font:600 1rem system-ui;cursor:pointer;text-decoration:none}
button.secondary{background:transparent;color:var(--fg);border:1px solid #3a4568}label{display:flex;gap:10px;align-items:flex-start;margin:10px 0}
input[type=checkbox]{width:20px;height:20px;margin-top:2px;flex:none}select{font:inherit;padding:6px;border-radius:6px}
a{color:var(--accent)}:focus-visible{outline:3px solid #ffd166;outline-offset:2px}
</style></head><body><main>
<p class="muted"><a href="${home}">← ${esc(W[lang].home)}</a></p>
<h1>${esc(title)}</h1>
${body}
</main></body></html>`);
}

const langOf = (sub: EmailSub | null, q: { lang?: string }): Lang =>
  sub?.lang ?? (q.lang === 'en' ? 'en' : 'nb');

function invalid(reply: FastifyReply, lang: Lang) {
  const w = W[lang];
  return page(
    reply,
    lang,
    w.invalid,
    `<p>${esc(w.invalidBody)}</p><p><a class="btn" href="/">${esc(w.resubscribe)}</a></p>`,
    404,
  );
}

function hidden(id: string, t: string) {
  return `<input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(t)}">`;
}

const emailPages: FastifyPluginAsync = async (app) => {
  type Q = { id?: string; t?: string; lang?: string; saved?: string };

  // Confirmation needs a real click on the page, so link scanners that open e-mail links
  // can't confirm a subscription on someone's behalf.
  app.get('/varsel/bekreft', async (request, reply) => {
    const q = request.query as Q;
    const sub = q.id ? await emailSubs().get(q.id) : null;
    const lang = langOf(sub, q);
    if (!tokenMatches(sub, q.t)) return invalid(reply, lang);
    const w = W[lang];
    if (sub.status === 'active') return renderConfirmed(reply, sub);
    return page(
      reply,
      lang,
      w.confirmTitle,
      `<p>${fill(w.confirmBody, { place: sub.name })}</p>
<form method="post" action="/varsel/bekreft">${hidden(sub.id, sub.token)}<button type="submit">${esc(w.confirmButton)}</button></form>`,
    );
  });

  app.post(
    '/varsel/bekreft',
    { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const b = (request.body ?? {}) as Q;
      const sub = b.id ? await confirm(b.id, b.t) : null;
      if (!sub) return invalid(reply, b.lang === 'en' ? 'en' : 'nb');
      trackEvent('email_confirmed');
      return renderConfirmed(reply, sub);
    },
  );

  function renderConfirmed(reply: FastifyReply, sub: EmailSub) {
    const w = W[sub.lang];
    return page(
      reply,
      sub.lang,
      w.confirmedTitle,
      `<p>${fill(w.confirmedBody, { place: sub.name })}</p>
<p><a href="/varsel/innstillinger?id=${encodeURIComponent(sub.id)}&amp;t=${encodeURIComponent(sub.token)}">${esc(w.manageTitle)}</a></p>`,
    );
  }

  app.get('/varsel/innstillinger', async (request, reply) => {
    const q = request.query as Q;
    const sub = q.id ? await emailSubs().get(q.id) : null;
    const lang = langOf(sub, q);
    if (!tokenMatches(sub, q.t)) return invalid(reply, lang);
    return renderManage(reply, sub, q.saved === '1');
  });

  app.post(
    '/varsel/innstillinger',
    { config: { rateLimit: { max: 60, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const b = (request.body ?? {}) as Record<string, string | undefined>;
      const sub = b.id
        ? await updatePrefs(b.id, b.t, {
            alertDayBefore: b.dayBefore === 'on',
            alertNow: b.now === 'on',
            minChance: b.minHigh === 'on' ? 'high' : 'good',
            lang: b.lang === 'en' ? 'en' : 'nb',
          })
        : null;
      if (!sub) return invalid(reply, b.lang === 'en' ? 'en' : 'nb');
      trackEvent('email_prefs_saved');
      return renderManage(reply, sub, true);
    },
  );

  function renderManage(reply: FastifyReply, sub: EmailSub, saved: boolean) {
    const w = W[sub.lang];
    const chk = (on: boolean) => (on ? ' checked' : '');
    const hint = `${chanceLabel('good', sub.lang)} / ${chanceLabel('high', sub.lang)}`;
    return page(
      reply,
      sub.lang,
      w.manageTitle,
      `<p class="muted">${fill(w.manageFor, { place: sub.name, email: sub.email })}</p>
${saved ? `<p role="status"><strong>${esc(w.saved)}</strong></p>` : ''}
<form method="post" action="/varsel/innstillinger" class="card">${hidden(sub.id, sub.token)}
<label><input type="checkbox" name="dayBefore"${chk(sub.alertDayBefore)}> <span>${esc(w.dayBefore)}</span></label>
<label style="margin-left:30px"><input type="checkbox" name="minHigh"${chk(sub.minChance === 'high')}> <span>${esc(w.minHigh)} <span class="muted">(${esc(hint)})</span></span></label>
<label><input type="checkbox" name="now"${chk(sub.alertNow)}> <span>${esc(w.now)}</span></label>
<p><label for="lang" style="display:inline">${esc(w.language)}</label>
<select id="lang" name="lang"><option value="nb"${sub.lang === 'nb' ? ' selected' : ''}>Norsk (bokmål)</option><option value="en"${sub.lang === 'en' ? ' selected' : ''}>English</option></select></p>
<button type="submit">${esc(w.save)}</button></form>
<p class="muted">${esc(w.changePlace)}</p>
<form method="post" action="/varsel/avmeld">${hidden(sub.id, sub.token)}<button type="submit" class="secondary">${esc(w.unsubscribeButton)}</button></form>`,
    );
  }

  // One click from the e-mail footer: the page submits itself (people with JavaScript off press
  // the button). Mail clients also get RFC 8058 one-click via the List-Unsubscribe headers.
  app.get('/varsel/avmeld', async (request, reply) => {
    const q = request.query as Q;
    const sub = q.id ? await emailSubs().get(q.id) : null;
    const lang = langOf(sub, q);
    if (!tokenMatches(sub, q.t)) {
      return page(reply, lang, W[lang].unsubbedTitle, `<p>${esc(W[lang].invalidBody)}</p>`);
    }
    const w = W[lang];
    return page(
      reply,
      lang,
      w.unsubTitle,
      `<form id="u" method="post" action="/varsel/avmeld">${hidden(sub.id, sub.token)}<button type="submit">${esc(w.unsubscribeButton)}</button></form>
<noscript><p class="muted">${esc(w.unsubNoscript)}</p></noscript>
<script>document.getElementById('u').submit()</script>`,
    );
  });

  app.post(
    '/varsel/avmeld',
    { config: { rateLimit: { max: 60, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const b = (request.body ?? {}) as Q;
      const sub = b.id ? await unsubscribe(b.id, b.t) : null;
      const lang: Lang = sub?.lang ?? (b.lang === 'en' ? 'en' : 'nb');
      const w = W[lang];
      if (sub) trackEvent('email_unsubscribed', { via: 'page' });
      return page(
        reply,
        lang,
        w.unsubbedTitle,
        `<p>${fill(w.unsubbedBody, { place: sub?.name ?? '' })}</p><p><a class="btn" href="/">${esc(w.resubscribe)}</a></p>`,
      );
    },
  );
};

export default emailPages;
