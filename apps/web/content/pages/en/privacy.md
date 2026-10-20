---
key: privacy
title: "Privacy and cookies"
description: "What Nordlys i natt? processes, why, how long it is kept, which third parties are involved, and how ads and consent are handled."
updated: 2026-10-20
---
Nordlys i natt? is built to collect as little data about you as possible. This page explains what is processed when you use the site, why, and what choices you have.

**Controller:** Maxim Salnikov, Norway. Contact: <!--email--> (more options on the [contact page](page:contact)).

## In short

- No sign-in and no user accounts.
- We use no cookies and no cross-site tracking.
- Your location is used to calculate the forecast and is not stored on the server – unless you turn on aurora alerts yourself.
- Visits are counted in aggregate on our own server, without cookies.
- No ads are shown today. If we introduce ads from Google, you will be asked for consent first where the law requires it (see below).

## What is processed, and why

### Location and forecast

When you pick a place – via your device location, the place search or a preset city – your browser sends latitude and longitude (rounded to four decimals) to our server. The server fetches the Kp forecast from NOAA and weather and sun data from MET Norway and calculates the answer. The coordinates are used only for this and are not stored. Legal basis: you requested the service (legitimate interest / contract).

### Stored on your device

Your browser stores the chosen place, language and the latest forecast locally (localStorage) so the site opens quickly next time. This stays on your device and is not sent to us. You can delete it by clearing site data in your browser. The app also uses a service worker to work offline.

### Aurora alerts (optional)

You can get a heads-up the day before a good chance of aurora in three ways. For all three we store the place you chose (rounded to two decimals, about one kilometre), its name, your language, your alert settings and when we last sent an alert, in Azure Table Storage in Norway. The legal basis is your consent (GDPR Art. 6(1)(a)), which you can withdraw at any time.

- **Browser (push):** your browser's push subscription. Alerts are delivered through your browser vendor's push service (for example Google, Mozilla or Apple). Turning alerts off deletes the subscription.
- **E-mail:** your e-mail address. We first send an e-mail with a confirmation link (double opt-in); without confirmation nothing more is sent, and unconfirmed addresses are deleted after seven days. E-mail is sent with Microsoft's Azure Communication Services, with data stored in Norway/the EU. We do not track opens or clicks. Every e-mail has a one-click unsubscribe link and a link to your settings; unsubscribing deletes the address immediately. One address can have alerts for up to five places.
- **App (iPhone/Android):** a push token for your phone. Alerts are delivered through Apple Push Notification service or Google Firebase Cloud Messaging. Turning alerts off in the app deletes the token.

We only use this to send aurora alerts, never share it and never use it for advertising. The sign-up form has simple bot protection (a limit on attempts and a hidden field), with no cookies.

### Visit statistics

The server counts page views (which page was opened) and which verdicts were given, with a coarse latitude rounded to whole degrees (about 111 km). This is sent to Microsoft Azure Application Insights. We use no cookies or client-side scripts for statistics, and we do not store full IP addresses in the statistics. Legal basis: legitimate interest in running and improving the service.

### Server logs

Like every website, the server receives technical information such as IP address and browser type when a page loads. This is used only for operations and security and is deleted on a rolling basis under the hosting provider’s routines.

## Third parties your browser contacts

Some features fetch data directly from public sources. These sources see your IP address, as with any web request:

- **Kartverket** (Norwegian Mapping Authority) – place-name search (ws.geonorge.no) and map tiles (cache.kartverket.no).
- **Microsoft Azure** (Norway East) – hosting and storage.
- **agentprose.cloud** – a small script on every page that makes the content readable and usable for AI assistants and browser agents (WebMCP). It sets no cookies and does not track you across sites. According to the provider, it records only anonymous usage statistics with a random ID per page view and does not store IP addresses.

## Ads and Google cookies

No ads are shown on the site today. We are considering Google AdSense to cover running costs. If ads are switched on, the following applies:

- Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.
- Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.
- You may opt out of personalised advertising in [Google’s Ads Settings](https://adssettings.google.com/), or opt out of other vendors’ cookies at [aboutads.info](https://www.aboutads.info/choices/).
- Read [how Google uses information from sites that use its services](https://policies.google.com/technologies/partner-sites).
- Visitors in the EEA, the UK and Switzerland will be asked for consent through a certified consent management platform (CMP) before advertising cookies are set. You can change or withdraw consent at any time via the link that will then appear at the bottom of the page.

This page will be updated, with a new date, before ads are switched on.

## The iPhone and Android app

The app shows the same forecast as the site and uses the same data sources. On top of that:

- **Alerts:** if you turn on alerts in the app, we store your phone's push token, the place you chose (rounded to about one kilometre), your language and your alert settings, as described under *Aurora alerts* above. Turning alerts off in the app deletes it.
- **Ads (Google AdMob):** the app shows a banner at the bottom of the main screen. Ads are served by Google AdMob, which processes your device's advertising ID, IP address and device information to show, measure and protect ads. In the EEA, the UK and Switzerland you are first asked for consent through Google's consent form, and without consent only non-personalised ads are shown. On iPhone, Apple asks whether the app may use the advertising identifier (App Tracking Transparency). You can change your choice at any time under *Ad privacy settings* at the bottom of the app, and reset or delete the advertising ID in your phone's settings. See [Google's privacy policy](https://policies.google.com/privacy) and [how Google uses advertising](https://policies.google.com/technologies/ads). Legal basis: consent (GDPR Art. 6(1)(a)) for personalised ads; legitimate interest in financing a free service (Art. 6(1)(f)) for non-personalised ads.

The app has no account, no in-app purchases, and does not read your contacts, photos or precise location.

## Your rights

You have the right to access, rectify, erase, restrict and object to processing, and the right to complain to the Norwegian Data Protection Authority ([Datatilsynet](https://www.datatilsynet.no/en/)). Because there are no user accounts, we usually cannot link data to you. You delete alerts yourself: turn off push in the browser or the app, or use the unsubscribe link in any e-mail. [Contact us](page:contact) with any questions.

## Changes

We update this policy when the service changes. The date at the top shows the latest change.
