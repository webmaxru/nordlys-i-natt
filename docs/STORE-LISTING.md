# Store listing: texts, privacy answers, screenshots

Copy-paste material for App Store Connect and Google Play Console. Norwegian (Bokmål) is the
primary language; English is the second localisation.

## Basics

| Field | Value |
|---|---|
| App name | **Nordlys i natt** (iOS, max 30 chars; Play, max 30) |
| iOS subtitle (30) | nb: `Varsel dagen før nordlyset` · en: `Aurora alerts a day ahead` |
| Category | **Weather** (secondary: Travel) |
| Price | Free (with ads) |
| Age rating | 4+ (Apple) / Everyone (IARC) |
| Privacy policy URL | https://nordlys.salnikov.no/personvern/ (en: https://nordlys.salnikov.no/en/privacy/) |
| Support URL | https://nordlys.salnikov.no/kontakt/ (en: https://nordlys.salnikov.no/en/contact/) |
| Marketing / website | https://nordlys.salnikov.no |
| Developer website (for app-ads.txt) | https://salnikov.no |
| Copyright | © 2026 Maxim Salnikov |
| Contains ads | **Yes** |
| Bundle ID / package | `no.salnikov.nordlys` |

## Short description (Google Play, max 80)

- nb: `Få varsel dagen før din beste sjanse til å se nordlyset der du er.`
- en: `Get a heads-up the day before your best chance to see the northern lights.`

## Keywords (App Store, max 100, comma-separated, no spaces)

- nb: `nordlys,aurora,nordlysvarsel,kp,kp-indeks,varsel,tromsø,lofoten,skydekke,nordlyskart,i natt`
- en: `aurora,northern lights,aurora forecast,kp index,alert,norway,tromso,lofoten,cloud cover,tonight`

## Promotional text (App Store, max 170)

- nb: `Ikke gå glipp av nordlyset: få varsel dagen før en god natt der du er, og et enkelt JA / KANSKJE / NEI for i natt.`
- en: `Never miss the aurora: get a heads-up the day before a good night where you are, plus a simple YES / MAYBE / NO for tonight.`

## Full description

### Norsk (bokmål)

```
Nordlys i natt gir deg beskjed dagen før din beste sjanse til å se nordlyset – der du er.

Velg et sted, slå på varsler, og få en melding på ettermiddagen før en natt med god sjanse. Én melding per natt, aldri spam. Vil du ha det med en gang det skjer, kan du også slå på «skjer nå»-varsel.

SLIK FUNGERER DET
• Vi kombinerer nordlysaktivitet (Kp-varsel fra NOAA), skydekke (Meteorologisk institutt) og mørke for akkurat ditt sted.
• Hver natt får en sjanse: ingen, liten, god eller stor.
• Er morgendagens natt god nok, får du varselet mellom kl. 15 og 21 dagen før.

I APPEN
• JA / KANSKJE / NEI for i natt, med tidslinje for natten
• Kart over nordlysovalen
• Sjansen de neste nettene
• 20+ guider om nordlys, Kp-indeksen, foto og de beste stedene i Norge
• Norsk og engelsk

Gratis, uten konto og uten innlogging. Appen viser en liten annonse nederst; ingen annonser når du setter opp varsler.

Data: NOAA Space Weather Prediction Center, Meteorologisk institutt (MET Norway) og Kartverket.
```

### English

```
Nordlys i natt tells you the day before your best chance to see the northern lights – where you are.

Pick a place, turn on alerts, and get a notification in the afternoon before a night with a good chance. One alert per night, never spam. Want to know the moment it happens? Turn on the optional "happening now" alert too.

HOW IT WORKS
• We combine aurora activity (NOAA Kp forecast), cloud cover (Norwegian Meteorological Institute) and darkness for your exact location.
• Every night gets a chance: none, low, good or high.
• If tomorrow night is good enough, you get the heads-up between 15:00 and 21:00 the day before.

IN THE APP
• YES / MAYBE / NO for tonight, with a timeline for the night
• Map of the auroral oval
• Chances for the next nights
• 20+ guides on the aurora, the Kp index, photography and the best places in Norway
• Norwegian and English

Free, no account, no sign-in. The app shows a small ad at the bottom; no ads while you set up alerts.

Data: NOAA Space Weather Prediction Center, MET Norway and the Norwegian Mapping Authority (Kartverket).
```

### What's new (1.0.0)

- nb: `Første versjon: varsel dagen før nordlyset, rett på telefonen.`
- en: `First release: aurora alerts the day before, straight to your phone.`

## Google Play: Data safety

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Yes** |
| Is all data encrypted in transit? | **Yes** |
| Can users request deletion? | **Yes**: turning alerts off deletes the device registration; ads data via Google's controls |

Data types:

| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Location → **Approximate location** (the saved place, rounded to ~1 km) | Yes | No | Optional (only when alerts are on) | App functionality |
| Device or other IDs (push token) | Yes | No | Optional (alerts) | App functionality |
| Device or other IDs (**advertising ID**, by the Google Mobile Ads SDK) | Yes | **Yes** (Google) | Not optional for ads (consent in the EEA) | Advertising or marketing |
| App info and performance → Crash logs / Diagnostics (Google Mobile Ads SDK) | Yes | Yes (Google) | No | Advertising, analytics |

Not collected: name, e-mail (in the app), contacts, photos, precise location, financial info,
messages, health, web history.

Other Play declarations: **Ads: Yes**. **Target audience: 18+** (not designed for children).
**Advertising ID: Yes, used for advertising.** **Government app: No.** **Financial features: none.**
**Health: none.** **News app: No.**

## Apple: App Privacy ("nutrition label")

Data used to track you: **Device ID** (advertising identifier, only with ATT permission) –
Third-party advertising.

Data linked to you: **none**.

Data not linked to you:

| Category | Data | Purpose |
|---|---|---|
| Location | Coarse location | App functionality |
| Identifiers | Device ID (push token) | App functionality |
| Identifiers | Device ID (advertising) | Third-party advertising |
| Usage data | Advertising data | Third-party advertising |
| Diagnostics | Performance data | Third-party advertising (Google Mobile Ads SDK) |

Privacy manifest: `apps/mobile/ios/App/App/PrivacyInfo.xcprivacy` (the app's own code). Google's
SDKs bring their own manifests.

## Content rating (IARC questionnaire, Play) / Age rating (Apple)

Category: Reference, news or educational / Utility. Answer **No** to violence, sexuality,
language, controlled substances, gambling, user-generated content, location *sharing* with other
users, and digital purchases. It has ads. Expected: **Everyone / PEGI 3 / 4+**.

## App Review notes (Apple)

```
No login is needed. To test alerts: pick a place (search "Tromsø"), scroll to "Nordlysvarsel" (Aurora alerts), tap "Slå på varsler" (Turn on alerts) and allow notifications. Alerts are sent the afternoon before a night with a good aurora chance, so one may not arrive during review. The forecast, the auroral oval map, the night chances and the guides work immediately. The app uses native push notifications (APNs) and shows an AdMob banner after Google's consent form; there are no in-app purchases.
```

(Apple's Guideline 4.2 "minimum functionality": the app adds native notifications, a native
consent flow and offline-capable guides on top of the website, and says so in the description.)

## Screenshots

GitHub → Actions → **Store screenshots** → Run workflow. The artifact `store-screenshots` has
every size below, in nb and en, rendered from the live site in the app layout:

| Store | Device class | Size (portrait, px) | Folder |
|---|---|---|---|
| App Store | iPhone 6.9" (required) | 1320 × 2868 | `ios-6.9` |
| App Store | iPad 13" (required for iPad) | 2064 × 2752 | `ios-ipad-13` |
| Google Play | Phone | 1080 × 2400 | `android-phone` |
| Google Play | 7" tablet | 1200 × 1920 | `android-tablet-7` |
| Google Play | 10" tablet | 1600 × 2560 | `android-tablet-10` |

Play also needs a **feature graphic** (1024 × 500): `android-feature-graphic.png` in the same
artifact. The icon (512 × 512 for Play) is `apps/mobile/assets/icon-only.png` scaled down (also in
the artifact).

Local run: `pnpm --filter @nordlys/web exec node scripts/store-screenshots.mjs` (needs Playwright's
Chromium).
