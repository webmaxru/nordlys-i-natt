import type { AlertMessage } from '@nordlys/shared';

export type Lang = 'nb' | 'en';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const T = {
  nb: {
    brand: 'Nordlys i natt?',
    footer:
      'Du får denne e-posten fordi du ba om nordlysvarsel for {place} på nordlys.salnikov.no.',
    unsubscribe: 'Avslutt varsler',
    manage: 'Endre innstillinger',
    open: 'Se varselet for {place}',
    data: 'Data: NOAA SWPC (Kp), MET Norge (skydekke). Varselet er et estimat, ikke en garanti.',
    confirmSubject: 'Bekreft nordlysvarsel for {place}',
    confirmIntro: 'Hei! Noen (forhåpentligvis du) ba om nordlysvarsel på e-post for {place}.',
    confirmWhat:
      'Vi sender en e-post dagen før en god sjanse for nordlys der, vanligvis mellom kl. 15 og 21. Høyst én e-post per natt.',
    confirmButton: 'Bekreft varsel',
    confirmIgnore:
      'Ba du ikke om dette? Da kan du se bort fra e-posten. Vi sender ikke flere uten bekreftelse.',
    alreadySubject: 'Du har allerede nordlysvarsel for {place}',
    alreadyIntro: 'Du har allerede et aktivt nordlysvarsel for {place}. Du trenger ikke gjøre noe.',
  },
  en: {
    brand: 'Aurora tonight?',
    footer:
      'You are getting this e-mail because you asked for aurora alerts for {place} on nordlys.salnikov.no.',
    unsubscribe: 'Unsubscribe',
    manage: 'Change settings',
    open: 'See the forecast for {place}',
    data: 'Data: NOAA SWPC (Kp), MET Norway (cloud cover). A forecast is an estimate, not a guarantee.',
    confirmSubject: 'Confirm aurora alerts for {place}',
    confirmIntro: 'Hi! Someone (hopefully you) asked for aurora alerts by e-mail for {place}.',
    confirmWhat:
      'We e-mail you the day before a good chance of seeing the aurora there, usually between 15:00 and 21:00 Norwegian time. At most one e-mail per night.',
    confirmButton: 'Confirm alerts',
    confirmIgnore:
      "Didn't ask for this? Just ignore this e-mail. Nothing more is sent without confirmation.",
    alreadySubject: 'You already have aurora alerts for {place}',
    alreadyIntro:
      'You already have active aurora alerts for {place}. There is nothing you need to do.',
  },
} as const;

export function strings(lang: Lang) {
  return T[lang];
}

const fill = (s: string, place: string) => s.replace(/\{place\}/g, place);

function layout(opts: {
  lang: Lang;
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; href: string };
  footerLinks: { label: string; href: string }[];
  footer: string;
}): string {
  const links = opts.footerLinks
    .map((l) => `<a href="${esc(l.href)}" style="color:#4d5b7c">${esc(l.label)}</a>`)
    .join(' &middot; ');
  const button = opts.button
    ? `<p style="margin:24px 0"><a href="${esc(opts.button.href)}" style="background:#1e6b52;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">${esc(opts.button.label)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="${opts.lang === 'nb' ? 'nb' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2235">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px">
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.55">
<p style="margin:0 0 4px;font-size:13px;color:#4d5b7c">${esc(T[opts.lang].brand)}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(opts.heading)}</h1>
${opts.paragraphs.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join('\n')}
${button}
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:12px;line-height:1.5;color:#4d5b7c">
<p style="margin:0 0 8px">${esc(opts.footer)}</p>
<p style="margin:0">${links}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

export interface Links {
  manage: string;
  unsubscribe: string;
  confirm?: string;
  open?: string;
}

/** The alert e-mail. `msg` comes from the shared alertMessage(), so words match push and app. */
export function alertEmail(lang: Lang, place: string, msg: AlertMessage, links: Links) {
  const t = T[lang];
  const subject = msg.title.replace(/^🌌\s*/, '') + ` – ${place}`;
  const html = layout({
    lang,
    preheader: msg.summary,
    heading: msg.title,
    paragraphs: [msg.body, t.data],
    button: links.open ? { label: fill(t.open, place), href: links.open } : undefined,
    footerLinks: [
      { label: t.manage, href: links.manage },
      { label: t.unsubscribe, href: links.unsubscribe },
    ],
    footer: fill(t.footer, place),
  });
  const text = [
    msg.title,
    '',
    msg.body,
    '',
    links.open ? `${fill(t.open, place)}: ${links.open}` : '',
    '',
    t.data,
    '',
    '--',
    fill(t.footer, place),
    `${t.manage}: ${links.manage}`,
    `${t.unsubscribe}: ${links.unsubscribe}`,
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');
  return { subject, html, text };
}

export function confirmEmail(lang: Lang, place: string, links: Links & { confirm: string }) {
  const t = T[lang];
  const subject = fill(t.confirmSubject, place);
  const paragraphs = [fill(t.confirmIntro, place), t.confirmWhat];
  const html = layout({
    lang,
    preheader: t.confirmWhat,
    heading: subject,
    paragraphs,
    button: { label: t.confirmButton, href: links.confirm },
    footerLinks: [{ label: t.unsubscribe, href: links.unsubscribe }],
    footer: t.confirmIgnore,
  });
  const text = [
    subject,
    '',
    ...paragraphs,
    '',
    `${t.confirmButton}: ${links.confirm}`,
    '',
    t.confirmIgnore,
  ].join('\n');
  return { subject, html, text };
}

export function alreadyEmail(lang: Lang, place: string, links: Links) {
  const t = T[lang];
  const subject = fill(t.alreadySubject, place);
  const html = layout({
    lang,
    preheader: fill(t.alreadyIntro, place),
    heading: subject,
    paragraphs: [fill(t.alreadyIntro, place)],
    footerLinks: [
      { label: t.manage, href: links.manage },
      { label: t.unsubscribe, href: links.unsubscribe },
    ],
    footer: fill(t.footer, place),
  });
  const text = [
    subject,
    '',
    fill(t.alreadyIntro, place),
    '',
    `${t.manage}: ${links.manage}`,
    `${t.unsubscribe}: ${links.unsubscribe}`,
  ].join('\n');
  return { subject, html, text };
}
