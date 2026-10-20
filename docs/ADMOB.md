# AdMob: ads in the iOS/Android apps

AdMob is Google's mobile counterpart of AdSense. The website keeps AdSense; the apps use AdMob.
Both pay into the same Google payments profile when you use the same Google account.

## What the app already does

- One **adaptive banner** at the bottom of the main screen. There is no banner while the alert
  set-up is on screen, and no interstitials or pop-ups.
- On first launch it shows **Google's consent form (UMP)** to users in the EEA, the UK and
  Switzerland. Ads are only requested once UMP says it is allowed.
- On iPhone, it then shows **Apple's App Tracking Transparency** prompt (text: "Lets the app show ads
  that are more relevant to you…"). Without permission, ads are non-personalised.
- **Ad privacy settings** in the footer reopens the consent form (Google requires a way to change it).
- **No ad unit configured = no ads.** Store builds show ads only after you set the IDs below. Debug
  builds (CI) use Google's official test units.

Code: `apps/web/src/native/ads.ts`. Plugin: `@capacitor-community/admob` 8.2.

## Setup (Maxim, once)

### 1. AdMob account

1. Go to https://admob.google.com and sign in with **the same Google account as AdSense**.
2. Accept the terms; country Norway, time zone Europe/Oslo, currency NOK (or EUR).
3. Your publisher ID is in **Settings → Account information** (`pub-…`). With the same account
   it is normally the AdSense ID, `pub-6118980043742623`. Use whatever AdMob shows.

### 2. Add the two apps

AdMob → **Apps → Add app**, twice:

| | Android | iOS |
|---|---|---|
| Platform | Android | iOS |
| Listed on a store? | *No* for now (link it after publishing, step 5) | *No* for now |
| App name | Nordlys i natt | Nordlys i natt |
| User metrics | on | on |

Each app gets an **App ID** like `ca-app-pub-6118980043742623~1234567890`.

### 3. Create the banner units

In each app → **Ad units → Add ad unit → Banner** → name `Bottom banner` → Create. You get an
**ad unit ID** like `ca-app-pub-6118980043742623/1234567890`.

### 4. Put the IDs in GitHub

GitHub → Settings → Secrets and variables → Actions → **Variables** (these IDs are not secret):

| Variable | Value |
|---|---|
| `ADMOB_APP_ID_ANDROID` | the Android App ID (`…~…`) |
| `ADMOB_APP_ID_IOS` | the iOS App ID (`…~…`) |
| `ADMOB_BANNER_ANDROID` | the Android banner unit (`…/…`) |
| `ADMOB_BANNER_IOS` | the iOS banner unit (`…/…`) |

PowerShell alternative:

```powershell
$R = "webmaxru/nordlys-i-natt"
gh variable set ADMOB_APP_ID_ANDROID -R $R --body "ca-app-pub-...~..."
gh variable set ADMOB_APP_ID_IOS     -R $R --body "ca-app-pub-...~..."
gh variable set ADMOB_BANNER_ANDROID -R $R --body "ca-app-pub-.../..."
gh variable set ADMOB_BANNER_IOS     -R $R --body "ca-app-pub-.../..."
```

The next store build (tag `mobile-v…`) carries real ads.

### 5. Link the store listings (after the apps are live)

AdMob → the app → **App settings → App store details → Add** → find the published app. AdMob
needs this to verify app-ads.txt and to serve ads at full volume.

### 6. app-ads.txt

The stores list a **developer website**. Use `https://salnikov.no`: Play Console → Store
settings → Website, and App Store Connect → the app's Marketing URL / your developer website.
AdMob then looks for `https://salnikov.no/app-ads.txt`, which must contain exactly:

```
google.com, pub-6118980043742623, DIRECT, f08c47fec0942fa0
```

(Use the publisher ID from step 1 if it differs.) `salnikov.no` is served by the
`webmaxru.github.io` repository. Add a file `app-ads.txt` with that line in its root, next to the
existing `ads.txt`, and commit. Check it at https://salnikov.no/app-ads.txt. AdMob crawls it within
about 24 hours: Apps → *app-ads.txt* tab shows the status.

### 7. Consent message (GDPR)

AdMob → **Privacy & messaging → European regulations** → Create message:

- Apps: both Nordlys i natt apps
- Languages: **Norwegian Bokmål** and **English**
- Privacy policy URL: `https://nordlys.salnikov.no/personvern/`
- Options: *Consent* + *Manage options* (and *Do not consent* if offered); keep Google's defaults
- **Publish**

Optional: **Privacy & messaging → IDFA explainer** (iOS) shows a short Google screen before
Apple's tracking prompt. The app needs no change for either.

### 8. SKAdNetwork IDs (iOS)

The iOS `Info.plist` has Google's own ID (`cstr6suwn9.skadnetwork`). Before the first iOS release
with real ads, add the rest of Google's list from
https://developers.google.com/admob/ios/privacy/strategies#skadnetwork to
`apps/mobile/ios/App/App/Info.plist` (`SKAdNetworkItems`). Or ask me and I'll add it.

### 9. Payments

AdMob → **Payments**. With the same Google account it is the same payments profile as AdSense: name,
address (Bestumveien 63B, 0283 Oslo), **bank account (IBAN)**, and **tax info** (Google asks
for US tax info: an individual outside the US fills in the W-8BEN form in the tax section). Google
pays monthly, around the 21st, once your balance passes the payment threshold shown there.

## Rules to keep (Google policy)

- Never click your own ads. Test with debug builds (test ads) or add your phone as a test device
  (AdMob → Settings → Test devices).
- Keep ads away from buttons and the notification set-up (already done).
- The app is not aimed at children; answer "No" to the Families/children questions in both stores.

## Store privacy answers caused by ads

AdMob collects the **advertising ID** and coarse device data, and Google uses it for ads. The
Play *Data safety* and Apple *App Privacy* answers in [STORE-LISTING.md](STORE-LISTING.md)
already include this.
