---
id: how-this-site-works
lang: en
slug: how-nordlys-i-natt-works
title: "How Nordlys i natt? works: yes, maybe or no"
description: "How Nordlys i natt? combines the Kp forecast, cloud cover and darkness into JA, KANSKJE or NEI, what it leaves out, and how alerts and privacy work."
category: forecast
published: 2026-10-18
updated: 2026-10-18
summary: "Behind the JA, KANSKJE or NEI answer are three open data sources and a few simple, open rules. How the verdict is made, where it can go wrong, and what happens to your location."
faq:
  - q: "What do JA, KANSKJE and NEI mean?"
    a: "They are Norwegian for yes, maybe and no. JA means at least one dark hour in the next 24 hours is expected to have enough aurora activity for your latitude and under 40 percent cloud. KANSKJE means a near miss. NEI means darkness, activity or clear skies are missing."
  - q: "Does Nordlys i natt? take the Moon into account?"
    a: "No. The verdict uses Kp, cloud cover and the Sun's elevation. Moonlight, city lights and your view to the north are for you to judge."
  - q: "Does Nordlys i natt? store my location?"
    a: "The place you choose is remembered in your browser. Usage statistics on the server keep only a coarse latitude, and no cookies are used. If you sign up for push alerts, the place is stored rounded to about a kilometre."
sources:
  - title: "Planetary K-index"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/products/planetary-k-index"
  - title: "Planetary K-index forecast (data product)"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
  - title: "Aurora - 30 Minute Forecast"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"
  - title: "Locationforecast data model"
    publisher: "MET Norway"
    url: "https://docs.api.met.no/doc/locationforecast/datamodel.html"
  - title: "Welcome to the MET Weather API"
    publisher: "MET Norway"
    url: "https://api.met.no/"
  - title: "Tussmørke (Twilight)"
    publisher: "Store norske leksikon"
    url: "https://snl.no/tussm%C3%B8rke"
  - title: "Web Push for Web Apps on iOS and iPadOS"
    publisher: "WebKit"
    url: "https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/"
  - title: "Tips on Viewing the Aurora"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/content/tips-viewing-aurora"
---

Nordlys i natt? ("Northern lights tonight?") answers one question: is it worth looking for the aurora where you are over the next 24 hours? The answer, JA, KANSKJE or NEI (Norwegian for yes, maybe or no), rests on three things: how much aurora activity is forecast, whether the sky will be clear, and whether it will get dark enough. The rules are simple and open, and this page explains them, along with what the answer leaves out.

## The three signals

For every hour of the next 24, the app looks at three conditions for exactly the place you have chosen:

1. **Darkness.** The app calculates how high the Sun is, hour by hour. An hour counts as dark when the Sun is more than 6 degrees below the horizon, that is, after the end of civil twilight. When the Sun is more than 12 degrees below the horizon (after nautical twilight), the sky counts as darker still. If there are no dark hours at all, as under the midnight sun, the answer is NEI. More on darkness and timing in [the best time of night](id:best-time-of-night).
2. **Aurora activity.** The app uses NOAA's Kp forecast, which comes in three-hour blocks, and takes the value closest in time for each hour. That is compared with the Kp needed at your latitude.
3. **Clouds.** The app fetches total cloud cover for your location from MET Norway (the Norwegian Meteorological Institute), hour by hour. Below 40 percent counts as clear enough. If the cloud forecast is missing for an hour, that hour is treated as overcast, to be on the safe side.

## How much Kp is needed?

The further north you are, the less activity you need, because the auroral oval usually sits over Northern Norway. The app uses this table:

| Latitude | Kp needed | Examples |
|---|---|---|
| 67° N and north | 1 | Tromsø, Alta, Lofoten |
| 64–67° N | 2 | Bodø, Helgeland coast |
| 62–64° N | 3 | Trondheim |
| 60–62° N | 4 | Bergen, Sogn |
| 58–60° N | 5 | Oslo, Stavanger |
| South of 58° N | 6 | Kristiansand |

These are rules of thumb, not exact physics. The background is in [the Kp index explained](id:kp-index).

## From hours to an answer

- **JA (yes):** at least one dark hour has both enough Kp for your latitude and cloud cover of 40 percent or less. The app then shows the best of those hours.
- **KANSKJE (maybe):** no hour is fully good, but at least one dark hour is a near miss: Kp is at most one step below what is needed, and cloud cover is 70 percent or less.
- **NEI (no):** everything else. The app tells you what is holding it back: it does not get dark, activity is too low, or there is too much cloud even though activity would have been enough.

To pick the best hour, the app gives each dark hour a score from 0 to 100. The Kp margin counts for 45 percent, how clear it is for 35 percent, and how dark it is for 20 percent. The score only ranks the hours; it is not a probability of seeing the aurora.

The map also shows NOAA's OVATION oval, which estimates where the aurora is and how intense it will be over the next 30 to 90 minutes, based on measured solar wind. The oval is there to show you the situation, but it is not used in the JA/KANSKJE/NEI verdict itself.

## How fresh is the data?

The Kp forecast and the oval come from the NOAA Space Weather Prediction Center, and the cloud forecast from MET Norway, which makes its data freely available. The app keeps a short-lived copy of the data, around 10 minutes for NOAA and 15 minutes for MET Norway, to go easy on the sources. MET Norway updates its Nordic forecasts every hour. More about the sources in [aurora apps and data sources](id:data-sources).

## What the answer leaves out

The answer is only as good as the data behind it, and there are things the app cannot see:

- **The Moon.** NOAA notes that a full moon makes the aurora look fainter. The app does not include moonlight.
- **City lights and terrain.** Street lights, mountains to the north or a narrow valley can spoil the view even with a JA.
- **Kp is coarse.** Kp is a global average over three hours. Intense bursts can come and go within a single block, and forecasts more than a day ahead are uncertain.
- **Cloud cover is for one point.** The forecast describes your spot, not necessarily the sky low in the north, which is where the aurora sits if you live further south.

A NEI therefore does not mean aurora is impossible, and a JA is no guarantee. See [clouds and clear skies](id:clouds-weather) and [how to read an aurora forecast](id:read-forecast) for ways to check for yourself.

## Push alerts: only if you ask

You can get a notification when the answer turns to JA for your place. It is entirely optional, and the app never asks for notification permission when you open the page. Only when you tap the button to subscribe does the app explain what you will get, and only after that does your browser ask for permission.

How the alerts behave:

- The app checks conditions for your place roughly every 20 minutes.
- You only get an alert when the answer is JA, and at most once every six hours while it stays JA.
- No alerts are sent between 02:00 and 06:00 Norwegian time.
- You can turn alerts off in the app at any time.

On iPhone and iPad, push notifications from websites only work once the site has been added to the Home Screen, from iOS and iPadOS 16.4 onwards. The app shows you how.

## Privacy

Nordlys i natt? is built to know as little about you as possible:

- **No cookies.** The app itself uses no cookies. Visits are counted on the server, without storing anything on your device for that purpose.
- **Your location.** You pick a place by searching or by tapping "Use my location". Your position is only requested when you ask. The place is remembered in your browser so you do not have to choose it again. To calculate the forecast, the coordinates are sent to the server. Usage statistics keep only a coarse latitude, rounded to whole degrees, which is roughly 111 kilometres.
- **Alerts.** If you subscribe to push alerts, your place is stored rounded to about a kilometre, together with your language and the technical push subscription from your browser. When you unsubscribe, the subscription is deleted.

The privacy page has the current details. Want to try it? [Check tonight's verdict for your location](app:).

## In short

- JA, KANSKJE and NEI are based on the Kp forecast, cloud cover and the Sun's elevation for your place, hour by hour over the next 24 hours.
- JA: dark, enough Kp for your latitude and at most 40 percent cloud. KANSKJE: close.
- The Moon, city lights and terrain are for you to judge.
- Alerts only come if you ask for them, at most every six hours, and never in the middle of the night.
