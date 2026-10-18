---
key: privacy
title: "Privacy and cookies"
description: "What Nordlys i natt? processes, why, how long it is kept, which third parties are involved, and how ads and consent are handled."
updated: 2026-10-18
---
Nordlys i natt? is built to collect as little data about you as possible. This page explains what is processed when you use the site, why, and what choices you have.

**Controller:** Maxim Salnikov, Norway. Contact: see the [contact page](page:contact).

## In short

- No sign-in and no user accounts.
- We do not use cookies or third-party tracking scripts today.
- Your location is used to calculate the forecast and is not stored on the server – unless you turn on aurora alerts yourself.
- Visits are counted in aggregate on our own server, without cookies.
- No ads are shown today. If we introduce ads from Google, you will be asked for consent first where the law requires it (see below).

## What is processed, and why

### Location and forecast

When you pick a place – via your device location, the place search or a preset city – your browser sends latitude and longitude (rounded to four decimals) to our server. The server fetches the Kp forecast from NOAA and weather and sun data from MET Norway and calculates the answer. The coordinates are used only for this and are not stored. Legal basis: you requested the service (legitimate interest / contract).

### Stored on your device

Your browser stores the chosen place, language and the latest forecast locally (localStorage) so the site opens quickly next time. This stays on your device and is not sent to us. You can delete it by clearing site data in your browser. The app also uses a service worker to work offline.

### Aurora alerts (optional)

If you turn on push alerts, we store your browser’s push subscription and a coarse location (rounded to two decimals, about one kilometre) in Azure Table Storage in Norway so we can notify you when conditions are good. Turning alerts off deletes the subscription. Legal basis: your consent.

### Visit statistics

The server counts page views (which page was opened) and which verdicts were given, with a coarse latitude rounded to whole degrees (about 111 km). This is sent to Microsoft Azure Application Insights. We use no cookies or client-side scripts for statistics, and we do not store full IP addresses in the statistics. Legal basis: legitimate interest in running and improving the service.

### Server logs

Like every website, the server receives technical information such as IP address and browser type when a page loads. This is used only for operations and security and is deleted on a rolling basis under the hosting provider’s routines.

## Third parties your browser contacts

Some features fetch data directly from public sources. These sources see your IP address, as with any web request:

- **Kartverket** (Norwegian Mapping Authority) – place-name search (ws.geonorge.no) and map tiles (cache.kartverket.no).
- **Microsoft Azure** (Norway East) – hosting and storage.

## Ads and Google cookies

No ads are shown on the site today. We are considering Google AdSense to cover running costs. If ads are switched on, the following applies:

- Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.
- Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.
- You may opt out of personalised advertising in [Google’s Ads Settings](https://adssettings.google.com/), or opt out of other vendors’ cookies at [aboutads.info](https://www.aboutads.info/choices/).
- Read [how Google uses information from sites that use its services](https://policies.google.com/technologies/partner-sites).
- Visitors in the EEA, the UK and Switzerland will be asked for consent through a certified consent management platform (CMP) before advertising cookies are set. You can change or withdraw consent at any time via the link that will then appear at the bottom of the page.

This page will be updated, with a new date, before ads are switched on.

## Your rights

You have the right to access, rectify, erase, restrict and object to processing, and the right to complain to the Norwegian Data Protection Authority ([Datatilsynet](https://www.datatilsynet.no/en/)). Because there are no user accounts, we usually cannot link data to you. You delete your push subscription yourself by turning off alerts. [Contact us](page:contact) with any questions.

## Changes

We update this policy when the service changes. The date at the top shows the latest change.
