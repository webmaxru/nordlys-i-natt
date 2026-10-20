# Mobile apps: build, release and one-time setup

The iOS and Android apps live in `apps/mobile`. They are a [Capacitor 8](https://capacitorjs.com)
shell around the same React app as the website (`apps/web`), so there is one codebase. The
website keeps the guides, SEO and AdSense; the apps add what a website can't do well:

- **native push** (APNs on iPhone, FCM on Android) for the day-before alert, never web push;
- **AdMob** banner ads, the mobile counterpart of AdSense ([ADMOB.md](ADMOB.md)).

Store texts, privacy answers and screenshots are in [STORE-LISTING.md](STORE-LISTING.md).

## Why Capacitor

| Option | One codebase with the site | Native push + AdMob | Effort | Verdict |
|---|---|---|---|---|
| **Capacitor** (chosen) | yes, the same React build | official/maintained plugins | small | ✅ |
| PWA only / TWA | yes | no iOS store app, no AdMob | smallest | not enough |
| React Native / Expo | no (rewrite of the UI) | yes | large | not worth it |
| Flutter / native | no | yes | largest | no |

## What is where

| Path | What |
|---|---|
| `apps/mobile/capacitor.config.ts` | app ID, name, plugins. `APP_ID` env overrides the ID |
| `apps/mobile/scripts/build-web.mjs` | builds `apps/web` with `VITE_TARGET=native` into `apps/web/dist-native` |
| `apps/mobile/android` | Android Studio project (Gradle). Signing comes from env, never the repo |
| `apps/mobile/ios` | Xcode project (Swift Package Manager, no CocoaPods) |
| `apps/web/src/native/` | the app-only code: push, deep links, ads + consent |
| `.github/workflows/mobile.yml` | CI builds and store uploads |
| `apps/api/src/routes/devices.ts`, `services/nativePush.ts` | device registration + sending (FCM HTTP v1, APNs) |
| `apps/api/src/routes/wellKnown.ts` | `assetlinks.json` and `apple-app-site-association` |

**App ID: `no.salnikov.nordlys`** (Android applicationId and iOS bundle ID). It is permanent once
the app is published: a different ID is a different app in the stores. To use another one, set
the GitHub variable `APP_ID` (and the same value in `capacitor.config.ts`'s default if you build
locally) *before* the first upload.

## How alerts work in the app

1. The user picks a place and taps **Turn on alerts** (Norwegian: *Slå på varsler*). Only then
   does the OS ask for notification permission.
2. The app gets a push token and registers it with the place at `POST /api/devices`.
3. The same scheduler as the website (every 20 minutes, `packages/shared/src/alerts.ts`) sends the
   day-before heads-up through FCM (Android) or APNs (iOS); see [ALERTS.md](ALERTS.md).
4. Tapping the notification opens the forecast for that place.

Web push is never offered inside the app (the panel only shows the app channel there; covered by
an e2e test).

Server-side sending goes straight to FCM HTTP v1 and APNs, both free with no device cap.
Azure Notification Hubs would add a second place to keep keys. Its free tier stops at 500
devices, and Basic costs about $10/month. Nothing here needs it.

## CI (every change)

`Mobile` workflow, on every PR and push that touches the apps:

| Job | Runner | Proves |
|---|---|---|
| Android debug APK | ubuntu | the Android project compiles (artifact `android-debug-apk`) |
| Android emulator smoke test | ubuntu + emulator (API 34) | the APK installs, launches and doesn't crash (artifact `android-smoke`: a screenshot + logcat) |
| iOS simulator build | macOS | the iOS project compiles (artifact `ios-simulator-app`) |

Debug builds use Google's **test** ad units. Try the APK on a phone: download the artifact,
then `adb install app-debug.apk`. Try the iOS build on a Mac: `xcrun simctl install booted App.app`.

## Release flow

1. Bump `version` in `apps/mobile/package.json` (e.g. `1.0.0` → `1.1.0`) and add a line to
   `apps/mobile/CHANGELOG.md`. The build number is the workflow run number + 1000, so it always goes up.
2. Tag and push (PowerShell, from an up-to-date `main`):
   ```powershell
   git pull
   git tag mobile-v1.1.0
   git push origin mobile-v1.1.0
   ```
   (or GitHub → Actions → Mobile → Run workflow → tick *release*).
3. The workflow builds a **signed AAB** and uploads it to **Google Play → Internal testing**.
   It also builds a **signed iOS archive** and uploads it to **App Store Connect → TestFlight**.
   Each runs only once its secrets below exist; otherwise it is skipped with a notice.
4. Test on your phone (Play internal testing link / TestFlight app).
5. Promote:
   - Play Console → *Test and release* → *Internal testing* → the release → **Promote release** →
     Closed testing or Production → Send for review.
   - App Store Connect → the app → the version → pick the build → **Add for Review** → Submit.

## One-time setup (Maxim)

Do these once. Secrets go in GitHub → Settings → Secrets and variables → Actions. Names are
below; nothing secret is ever committed.

### 1. Accounts

- **Apple Developer Program**: https://developer.apple.com/programs/ ($99/year). Enrol as an
  individual: the store then shows "Maxim Salnikov" as the seller.
- **Google Play Console**: https://play.google.com/console/signup ($25 once). A *personal*
  account must run a **closed test with at least 12 testers for 14 days** before it can publish to
  production. Start that early. Google also verifies your identity and address.

### 2. Apple: App ID, app record, push key, API key

1. developer.apple.com → Certificates, IDs & Profiles → **Identifiers** → + → App IDs → App →
   Bundle ID (explicit) `no.salnikov.nordlys`, description "Nordlys i natt". Tick capabilities
   **Push Notifications** and **Associated Domains**. Register.
2. appstoreconnect.apple.com → Apps → + **New App**: platform iOS, name **Nordlys i natt**,
   primary language **Norwegian Bokmål**, bundle ID `no.salnikov.nordlys`, SKU `nordlys-i-natt`.
3. **APNs key** (push): Certificates, IDs & Profiles → **Keys** → + → name "Nordlys APNs" → tick
   *Apple Push Notifications service (APNs)* → Continue → Register → **Download** the `.p8` (you can only
   download it once). Note the **Key ID** and your **Team ID** (top right of the page).
4. **App Store Connect API key** (CI uploads): App Store Connect → Users and Access →
   Integrations → App Store Connect API → Team Keys → + → name "GitHub CI", access **App Manager**
   → Generate → download the `.p8`, note the **Key ID** and the **Issuer ID**.

GitHub:

| Kind | Name | Value |
|---|---|---|
| secret | `APNS_KEY_P8` | contents of the APNs `.p8` (server push) |
| variable | `APNS_KEY_ID` | the APNs key ID |
| variable | `APNS_TEAM_ID` | your Team ID |
| variable | `APNS_BUNDLE_ID` | `no.salnikov.nordlys` |
| secret | `APP_STORE_CONNECT_API_KEY_P8` | contents of the API key `.p8` |
| secret | `APP_STORE_CONNECT_KEY_ID` | its Key ID |
| secret | `APP_STORE_CONNECT_ISSUER_ID` | the Issuer ID |
| variable | `APPLE_TEAM_ID` | your Team ID |

Setting the `APNS_*` values and running the **Deploy** workflow switches on iOS push on the
server. It also serves `https://nordlys.salnikov.no/.well-known/apple-app-site-association`, so
alert links open the app.

### 3. Firebase (Android push)

1. https://console.firebase.google.com → Add project "nordlys-i-natt" (Analytics not needed).
2. Project → Add app → Android → package `no.salnikov.nordlys` → Register → download
   **`google-services.json`**.
3. Project settings → **Service accounts** → *Generate new private key* → a JSON file (server key).

| Kind | Name | Value |
|---|---|---|
| secret | `GOOGLE_SERVICES_JSON` | contents of `google-services.json` (goes into the app) |
| secret | `FCM_SERVICE_ACCOUNT_JSON` | contents of the service-account JSON (server push) |

Then run **Deploy** (server side) and a mobile release (app side).

### 4. Android signing key (upload key)

Google Play keeps the real app signing key (Play App Signing). You keep an **upload key**.
Create it with the JDK's `keytool` (Android Studio ships one under
`C:\Program Files\Android\Android Studio\jbr\bin`). In PowerShell:

```powershell
keytool -genkeypair -v -keystore nordlys-upload.jks -alias nordlys -keyalg RSA -keysize 2048 -validity 10000
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\nordlys-upload.jks")) | Set-Content -NoNewline keystore.b64
Get-Content keystore.b64 -Raw | gh secret set ANDROID_KEYSTORE_BASE64 -R webmaxru/nordlys-i-natt
gh secret set ANDROID_KEYSTORE_PASSWORD -R webmaxru/nordlys-i-natt
Remove-Item keystore.b64
```

Keep `nordlys-upload.jks` and its password safe (a password manager plus a backup). If the
upload key is lost, Play support can reset it.

| Kind | Name | Value |
|---|---|---|
| secret | `ANDROID_KEYSTORE_BASE64` | the keystore, base64 |
| secret | `ANDROID_KEYSTORE_PASSWORD` | its password |
| secret | `ANDROID_KEY_PASSWORD` | only if the key password differs |
| variable | `ANDROID_KEY_ALIAS` | only if not `nordlys` |

### 5. Google Play: app record and CI access

1. Play Console → **Create app**: name "Nordlys i natt", default language Norwegian (nb-NO),
   App, Free. Accept the declarations.
2. Google Cloud console (any project, e.g. the Firebase one) → IAM & Admin → **Service accounts** →
   Create "play-publisher" → Keys → Add key → JSON.
3. Play Console → **Users and permissions** → Invite new users → the service account's e-mail →
   App permissions: Nordlys i natt → *Release to testing tracks* (and *Release to production* if you
   want CI to do that too) → Invite.
4. GitHub secret `PLAY_SERVICE_ACCOUNT_JSON` = the JSON key.
5. **First upload by hand.** Run a release (tag `mobile-v1.0.0`). Download the artifact
   `android-release-aab` from the run and upload it once in Play Console → Test and release →
   Internal testing → Create new release. After that, CI uploads by itself. Until the app has passed
   its first review, Play only accepts *draft* releases (the default here). After that you can set
   the variable `PLAY_RELEASE_STATUS=completed`.
6. **App Links:** Play Console → Test and release → **App integrity** → App signing → copy the
   **SHA-256 certificate fingerprint**. Set the GitHub variable `ANDROID_CERT_SHA256` to it and run Deploy.
   `https://nordlys.salnikov.no/.well-known/assetlinks.json` then lets links open the app.

### 6. Store listings, privacy and screenshots

Copy the texts and privacy answers from [STORE-LISTING.md](STORE-LISTING.md), and upload the
screenshots (GitHub → Actions → *Store screenshots* → artifact).
Privacy policy URL: `https://nordlys.salnikov.no/personvern/` (English: `/en/privacy/`).
Support URL: `https://nordlys.salnikov.no/kontakt/`.

### 7. Ads

[ADMOB.md](ADMOB.md): create the AdMob apps and banner units, then set the `ADMOB_*` variables. With no ad
unit set, store builds show **no ads**. Test ads only ever appear in debug builds.

## Local builds (optional)

You don't need these: CI builds everything. To open the projects in Android Studio or Xcode:

```powershell
pnpm install
pnpm --filter @nordlys/mobile sync      # builds the web app and copies it into both projects
pnpm --filter @nordlys/mobile open:android
```

iOS needs a Mac: `pnpm --filter @nordlys/mobile sync:ios`, then `open:ios`.

Icons and splash screens come from `apps/mobile/assets/` (`icon.png` 1024×1024,
`splash.png` 2732×2732). After changing those images, run `pnpm --filter @nordlys/mobile assets`
and commit the result.

## Checklist: what's done, what's yours

| Item | Status |
|---|---|
| App code: native push, deep links, AdMob + UMP + ATT, no web push in the app | ✅ done |
| Android + iOS projects, icons, splash, privacy manifest, permissions | ✅ done |
| CI: debug builds + emulator smoke test | ✅ green |
| CI: signed AAB → Play internal, archive → TestFlight | ✅ ready, waiting for secrets |
| Server: device registration, FCM + APNs sending, assetlinks/AASA | ✅ done, switched on by settings |
| Store texts (nb + en), privacy answers, screenshots | ✅ drafted ([STORE-LISTING.md](STORE-LISTING.md)) |
| Apple Developer + Play Console accounts | ⬜ Maxim |
| App ID, app records, keys, Firebase, keystore, GitHub secrets (sections 2–5) | ⬜ Maxim |
| AdMob account, apps, ad units, app-ads.txt, consent message ([ADMOB.md](ADMOB.md)) | ⬜ Maxim |
| Play closed test (12 testers × 14 days), then production | ⬜ Maxim |
| Submit for review in both stores | ⬜ Maxim |
