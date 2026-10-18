---
id: data-sources
lang: en
slug: aurora-apps-and-data
title: "Aurora apps and data sources: where the numbers come from"
description: "NOAA, MET Norway, Yr and Norwegian observatories sit behind almost every aurora app. How to use the sources directly and how to judge an app."
category: forecast
published: 2026-10-18
updated: 2026-10-18
summary: "Most aurora apps rely on a handful of open sources: NOAA for space weather, MET Norway and Yr for clouds, and Norwegian observatories for live measurements. How to use them, and how to tell a good app from a bad one."
faq:
  - q: "Where does the data in aurora apps come from?"
    a: "Usually from the NOAA Space Weather Prediction Center for Kp, solar wind and the auroral oval, and from a weather service such as MET Norway for clouds. Some also use Norwegian magnetometers and all-sky cameras."
  - q: "Are there Norwegian aurora forecasts?"
    a: "Yes. The Norwegian Centre for Space Weather at UiT in Tromsø shows aurora forecasts for the next few hours for several Norwegian locations, all-sky cameras and magnetometer data. Yr shows aurora activity alongside its cloud forecast."
  - q: "How can I see whether there is aurora right now?"
    a: "All-sky cameras, which photograph the whole sky, show what is happening. The Norwegian Centre for Space Weather has cameras in Tromsø and Skibotn that update regularly at night."
sources:
  - title: "Planetary K-index"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/products/planetary-k-index"
  - title: "Aurora - 30 Minute Forecast"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"
  - title: "About the Norwegian Centre for Space Weather"
    publisher: "Norwegian Centre for Space Weather (NOSWE), UiT"
    url: "https://site.uit.no/spaceweather/"
  - title: "Northern Lights / Aurora Borealis"
    publisher: "Norwegian Centre for Space Weather (NOSWE), UiT"
    url: "https://site.uit.no/spaceweather/aurora-borealis/"
  - title: "Northern Lights forecasts"
    publisher: "Norwegian Centre for Space Weather (NOSWE), UiT"
    url: "https://site.uit.no/spaceweather/data-and-products/aurora/"
  - title: "Geomagnetic Data from TGO"
    publisher: "Tromsø Geophysical Observatory, UiT"
    url: "https://flux.phys.uit.no/geomag.html"
  - title: "Welcome to the MET Weather API"
    publisher: "MET Norway"
    url: "https://api.met.no/"
  - title: "Tromsø – other forecasts"
    publisher: "Yr (NRK and the Norwegian Meteorological Institute)"
    url: "https://www.yr.no/nb/andre-varsler/1-305409/Norge/Troms/Troms%C3%B8/Troms%C3%B8"
---

There are plenty of aurora apps, but most of them draw on the same few sources: the US agency NOAA for space weather, the Norwegian Meteorological Institute for clouds, and Norwegian observatories for measurements in the north. Once you know the sources, you can check them yourself when it matters, and you will quickly spot the difference between an app that is honest about uncertainty and one that simply promises aurora.

## NOAA: space weather for the whole planet

The Space Weather Prediction Center (SWPC) at the US National Oceanic and Atmospheric Administration (NOAA) is where most aurora apps get their space weather data. It provides, among other things:

- **Estimated Kp**, calculated continuously from magnetometers in several countries, and the 3-day Kp forecast. See [the Kp index explained](id:kp-index).
- **The OVATION oval**, a map of where the aurora is expected over the next 30 to 90 minutes, calculated from solar wind measured at the L1 point about 1.6 million kilometres from Earth.
- **Solar wind data**, with speed, density and the direction of the magnetic field (Bz). See [solar wind, Bz and speed](id:solar-wind).
- **Watches, warnings and alerts** when a geomagnetic storm is expected or under way.

The data are public and also available in machine-readable form, which is why so many apps show the same Kp numbers. How to read the products step by step is covered in [how to read an aurora forecast](id:read-forecast).

## The Norwegian Centre for Space Weather and the Tromsø observatory

Norway has a long tradition of aurora research. The Norwegian Centre for Space Weather (NOSWE) recounts how, in 1910, the physicist Kristian Birkeland persuaded the Norwegian government to set up a permanent aurora observatory at Haldde near Alta, which NOSWE describes as the world's first. It operated from 1912 to 1926, and in 1928 the work moved to a new observatory in Tromsø (more on Alta in [the aurora in Alta and Finnmark](id:finnmark)). Today it is called the Tromsø Geophysical Observatory (TGO) and is part of UiT, the Arctic University of Norway.

According to NOSWE, TGO runs a chain of 19 magnetometers across mainland Norway, Sweden and the Barents Sea, as well as ionosondes, riometers and all-sky cameras. NOSWE was set up in 2014 together with the Norwegian Space Agency as a department under TGO, and in 2019 became Norway's regional space weather warning centre in the international ISES network.

For aurora hunters, these are the most useful parts of the NOSWE website:

- **Aurora forecasts for the next 1 and 4 hours** for places including Svalbard, Tromsø, Trondheim, Bergen and Oslo. They use the SvalTrackII software developed by Professor Fred Sigernes at the Kjell Henriksen Observatory (part of UNIS, the University Centre in Svalbard), which is also available as a mobile app.
- **A Kp forecast for roughly the next hour**, calculated from solar wind data measured at L1.
- **All-sky cameras** in Tromsø and Skibotn, showing the whole sky and updating every two minutes at night. They are switched off between 05 and 16 UT, and times are given in UT.
- **Magnetometer data and a geomagnetic summary** for Tromsø and Dombås, roughly representing northern and southern Norway.

TGO's magnetometer curves are also available in real time. When the curves swing wildly, the magnetic field is disturbed, and there is often aurora.

## MET Norway and Yr

Cloud cover matters as much as space weather, and here the Norwegian Meteorological Institute (MET Norway) is the key source. MET Norway makes its weather data freely available through an open API under a Creative Commons licence, including for commercial use. Many aurora apps take their cloud forecast from it.

For you as a user, the easiest way in is Yr, a joint service of the Norwegian broadcaster NRK and MET Norway. On the "Andre varsler" (other forecasts) page for a place, Yr shows aurora activity, the Kp index and cloud cover split into high, medium and low cloud and fog. You also get the Sun's and Moon's elevation, the Moon's phase and nearby webcams. See [clouds and clear skies](id:clouds-weather) for how to use the cloud forecast.

## Which source answers which question?

| Question | Best source |
|---|---|
| Will there be a storm in the next few days? | NOAA's 3-day forecast and watches |
| Where is the auroral oval in the next hour? | NOAA's OVATION, NOSWE's aurora forecast |
| Is it clear where I am tonight? | The hourly forecast on Yr, with cloud layers |
| Is anything happening right now? | All-sky cameras and magnetometers from TGO/NOSWE |
| All things considered, is it worth going out? | An app that combines everything, such as Nordlys i natt? |

## How to judge an aurora app

Many apps look alike but differ a lot underneath. Ask these questions:

- **Does it name its sources?** A good app tells you where its Kp, solar wind and cloud data come from, and when they were last updated.
- **Does it account for clouds and darkness?** A high Kp at midday or under thick cloud is worthless where you stand. An app that only shows Kp gives you half the picture.
- **Does it separate measured from forecast?** Observed Kp over the last few hours and forecast Kp for tomorrow are two different things.
- **Are the times in local time?** NOAA uses UT. An app that does not convert can shift your evening by one or two hours.
- **Does it explain its percentages?** "70 percent chance" means little if the app does not say what it is a chance of.
- **Are its notifications sensible?** Push alerts every half hour for Kp 3 in Oslo are noise. Good alerts arrive when it is actually worth going out.
- **Does it respect your privacy?** An aurora forecast needs your location, not your whole life. Check what the app stores and shares.

## How Nordlys i natt? does it

Nordlys i natt? uses the same open sources: the Kp forecast and OVATION oval from NOAA SWPC, the cloud forecast from MET Norway, and its own calculation of how high the Sun is where you are. Maps and place search come from Kartverket, the Norwegian Mapping Authority. The app combines all of this into one answer: JA, KANSKJE or NEI (yes, maybe or no), with the best hour and the reason. The details, and the limits, are in [how Nordlys i natt? works](id:how-this-site-works). You can [check tonight's verdict for your location](app:) right away.

## In short

- NOAA SWPC covers space weather: Kp, OVATION, solar wind and alerts.
- MET Norway and Yr cover the clouds, and Yr shows aurora and cloud layers side by side.
- The Norwegian Centre for Space Weather and TGO in Tromsø offer Norwegian aurora forecasts, all-sky cameras and magnetometers.
- A good app names its sources, factors in clouds and darkness, uses local time and is honest about uncertainty.
