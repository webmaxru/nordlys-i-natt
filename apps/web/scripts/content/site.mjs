// Site-wide settings for the static content section (articles, info pages, sitemap).
// Change SITE_URL here (or set the SITE_URL env var at build time) when the domain changes.

export const SITE_URL = (process.env.SITE_URL || 'https://nordlys.salnikov.no').replace(/\/+$/, '');
export const SITE_NAME = 'Nordlys i natt?';

/** Person responsible for the content (shown in bylines and Article structured data). */
export const EDITOR = {
  name: 'Maxim Salnikov',
  url: 'https://www.linkedin.com/in/webmax/',
};

/**
 * Public contact e-mail shown on the contact page. Left empty on purpose: the owner decides
 * which address to publish. While empty, the contact page offers GitHub issues + LinkedIn.
 * TODO(owner): set e.g. 'kontakt@salnikov.no' once that mailbox exists.
 */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || '';

/**
 * Google AdSense publisher ID, e.g. 'ca-pub-1234567890123456'. EMPTY ON PURPOSE until the
 * owner has an AdSense account. When set (here or via the ADSENSE_CLIENT env var at build time):
 *   - every page (app + content) gets <meta name="google-adsense-account"> and the AdSense
 *     loader script in <head> (Auto ads and Google's consent message are configured in AdSense),
 *   - ads.txt is generated with the matching "google.com, pub-…, DIRECT, f08c47fec0942fa0" line.
 * See docs/ADSENSE-READINESS.md before switching it on (privacy page + consent message).
 */
export const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || '';

export const GITHUB_URL = 'https://github.com/webmaxru/nordlys-i-natt';
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;

export const LANGS = ['nb', 'en'];

/** URL layout per language. Keep in sync with docs/CONTENT.md. */
export const ROUTES = {
  nb: {
    home: '/',
    hub: '/artikler/',
    article: (slug) => `/artikler/${slug}/`,
    category: (slug) => `/artikler/tema/${slug}/`,
    page: { about: '/om/', contact: '/kontakt/', privacy: '/personvern/', terms: '/vilkar/' },
  },
  en: {
    home: '/',
    hub: '/en/guides/',
    article: (slug) => `/en/guides/${slug}/`,
    category: (slug) => `/en/guides/topic/${slug}/`,
    page: {
      about: '/en/about/',
      contact: '/en/contact/',
      privacy: '/en/privacy/',
      terms: '/en/terms/',
    },
  },
};

export const CATEGORIES = [
  {
    id: 'science',
    nb: { name: 'Forstå nordlyset', slug: 'forsta-nordlyset' },
    en: { name: 'Understanding the aurora', slug: 'understanding-the-aurora' },
  },
  {
    id: 'forecast',
    nb: { name: 'Varsel og data', slug: 'varsel-og-data' },
    en: { name: 'Forecasts and data', slug: 'forecasts-and-data' },
  },
  {
    id: 'where',
    nb: { name: 'Hvor og når', slug: 'hvor-og-nar' },
    en: { name: 'Where and when', slug: 'where-and-when' },
  },
  {
    id: 'photo',
    nb: { name: 'Fotografering', slug: 'fotografering' },
    en: { name: 'Photography', slug: 'photography' },
  },
  {
    id: 'practical',
    nb: { name: 'Kultur og praktisk', slug: 'kultur-og-praktisk' },
    en: { name: 'Culture and practical tips', slug: 'culture-and-practical' },
  },
  {
    id: 'reference',
    nb: { name: 'Oppslag', slug: 'oppslag' },
    en: { name: 'Reference', slug: 'reference' },
  },
];

/** Reading order of the guides on listing pages (ids). Unlisted ids go last. */
export const ARTICLE_ORDER = [
  'what-is-aurora',
  'aurora-colours',
  'solar-wind',
  'solar-cycle',
  'geomagnetic-storms',
  'kp-index',
  'read-forecast',
  'clouds-weather',
  'data-sources',
  'how-this-site-works',
  'best-season',
  'best-time-of-night',
  'tromso',
  'lofoten',
  'finnmark',
  'svalbard',
  'southern-norway',
  'phone-photo',
  'camera-photo',
  'myths-sami',
  'safety-clothing',
  'faq',
  'glossary',
];

export const CATEGORY_INTRO = {
  science: {
    nb: 'Hva nordlyset er, hvorfor det har de fargene det har, og hvordan sola, solvinden og solsyklusen styrer det.',
    en: 'What the aurora is, why it has the colours it has, and how the Sun, the solar wind and the solar cycle drive it.',
  },
  forecast: {
    nb: 'Slik leser du Kp-indeksen, solvinddata og skyvarsler – og hvordan du bruker dem til å bestemme deg i kveld.',
    en: 'How to read the Kp index, solar wind data and cloud forecasts – and use them to decide what to do tonight.',
  },
  where: {
    nb: 'Når på året og når på natten du har best sjanse, og hvor i Norge du bør stå – fra Svalbard til Sør-Norge.',
    en: 'When in the year and the night your chances are best, and where in Norway to stand – from Svalbard to the south.',
  },
  photo: {
    nb: 'Få nordlyset med hjem: innstillinger og teknikk for mobilkamera og systemkamera.',
    en: 'Bring the aurora home: settings and technique for phone cameras and dedicated cameras.',
  },
  practical: {
    nb: 'Fortellinger og tradisjoner om nordlyset, og praktiske råd om klær og sikkerhet på vinterkvelder.',
    en: 'Stories and traditions about the aurora, and practical advice on clothing and safety on winter nights.',
  },
  reference: {
    nb: 'Ordliste og svar på de vanligste spørsmålene om nordlys.',
    en: 'A glossary and answers to the most common aurora questions.',
  },
};

/** Interface strings for the static pages. */
export const UI = {
  nb: {
    locale: 'nb_NO',
    htmlLang: 'nb',
    hubTitle: 'Artikler om nordlyset',
    hubIntro:
      'Uavhengige, kildebaserte guider om nordlyset i Norge: hvordan det oppstår, hvordan du leser varselet, hvor og når du bør se etter det, og hvordan du tar bilder av det.',
    navArticles: 'Artikler',
    navAbout: 'Om',
    navApp: 'Sjekk i natt',
    home: 'Forside',
    by: 'Av',
    editorial: 'redaksjonen i Nordlys i natt?',
    editor: 'Ansvarlig redaktør',
    published: 'Publisert',
    updated: 'Oppdatert',
    minRead: 'min lesing',
    toc: 'I denne artikkelen',
    sources: 'Kilder',
    sourcesNote:
      'Faktaopplysninger er kontrollert mot kildene under. Det som ikke kunne bekreftes, er merket «ikke verifisert».',
    related: 'Les også',
    faqTitle: 'Spørsmål og svar',
    ctaTitle: 'Kan du se nordlyset i natt?',
    ctaBody:
      'Få et enkelt JA, KANSKJE eller NEI for der du er – basert på Kp-varsel, skydekke og mørke.',
    ctaButton: 'Sjekk varselet',
    allIn: 'Alle artikler i',
    articlesCount: (n) => `${n} artikler`,
    otherLang: 'English',
    otherLangLabel: 'Read in English',
    footerAbout: 'Om nettstedet',
    footerContact: 'Kontakt',
    footerPrivacy: 'Personvern og informasjonskapsler',
    footerTerms: 'Vilkår for bruk',
    footerData: 'Data: NOAA SWPC · MET Norway · Kartverket',
    footerMadeBy: 'Laget i Norge av',
    skip: 'Hopp til innholdet',
    breadcrumb: 'Brødsmulesti',
    notFoundTitle: 'Fant ikke siden',
    dateFmt: (d) =>
      new Intl.DateTimeFormat('nb-NO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d),
  },
  en: {
    locale: 'en_US',
    htmlLang: 'en',
    hubTitle: 'Aurora guides',
    hubIntro:
      'Independent, sourced guides to the northern lights in Norway: how they form, how to read the forecast, where and when to look, and how to photograph them.',
    navArticles: 'Guides',
    navAbout: 'About',
    navApp: 'Check tonight',
    home: 'Home',
    by: 'By',
    editorial: 'the Nordlys i natt? editorial team',
    editor: 'Editor',
    published: 'Published',
    updated: 'Updated',
    minRead: 'min read',
    toc: 'In this article',
    sources: 'Sources',
    sourcesNote:
      'Facts were checked against the sources below. Anything that could not be confirmed is marked “unverified”.',
    related: 'Read next',
    faqTitle: 'Questions and answers',
    ctaTitle: 'Can you see the aurora tonight?',
    ctaBody:
      'Get a simple YES, MAYBE or NO for where you are – from the Kp forecast, cloud cover and darkness.',
    ctaButton: 'Check the forecast',
    allIn: 'All guides in',
    articlesCount: (n) => `${n} guides`,
    otherLang: 'Norsk',
    otherLangLabel: 'Les på norsk',
    footerAbout: 'About this site',
    footerContact: 'Contact',
    footerPrivacy: 'Privacy and cookies',
    footerTerms: 'Terms of use',
    footerData: 'Data: NOAA SWPC · MET Norway · Kartverket',
    footerMadeBy: 'Made in Norway by',
    skip: 'Skip to content',
    breadcrumb: 'Breadcrumb',
    notFoundTitle: 'Page not found',
    dateFmt: (d) =>
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d),
  },
};
