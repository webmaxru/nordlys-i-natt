---
id: solar-wind
lang: en
slug: solar-wind-bz-speed
title: "Solar wind, Bz and speed: how to read real-time aurora data"
description: "What do Bz, Bt, speed and density mean in solar wind data? How to read the real-time plots, and why they give 15–60 minutes of aurora warning."
category: science
published: 2026-10-18
updated: 2026-10-18
summary: "Bz, Bt, speed and density explained: what the numbers in the solar wind plot mean for the aurora, and how far ahead they can really tell you anything."
faq:
  - q: "What is Bz?"
    a: "Bz is the north–south component of the magnetic field in the solar wind. When it is negative, pointing south, for a sustained period, the solar wind couples efficiently to Earth's magnetic field and the aurora strengthens."
  - q: "How far ahead can solar wind data predict the aurora?"
    a: "The spacecraft at L1 are about 1.5 million km away, and according to NOAA they give 15–60 minutes of warning, depending on the solar wind speed."
  - q: "How fast is the solar wind?"
    a: "Near Earth it is usually 200–700 km/s, averaging about 400. Fast wind from coronal holes typically blows at 500–800 km/s, and the strongest CMEs travel faster still."
sources:
  - title: "Solvinden"
    publisher: "Store norske leksikon"
    url: "https://snl.no/solvinden"
  - title: "Solar Wind"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/phenomena/solar-wind"
  - title: "Geomagnetic Storms"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/phenomena/geomagnetic-storms"
  - title: "Real Time Solar Wind"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/products/real-time-solar-wind"
  - title: "DSCOVR: Deep Space Climate Observatory"
    publisher: "NOAA NESDIS"
    url: "https://www.nesdis.noaa.gov/our-satellites/currently-flying/dscovr-deep-space-climate-observatory"
  - title: "DSCOVR"
    publisher: "NASA"
    url: "https://science.nasa.gov/mission/dscovr/"
  - title: "SOLAR-1 Press Kit"
    publisher: "NOAA NESDIS"
    url: "https://www.nesdis.noaa.gov/our-satellites/future-programs/swfo/solar-1-press-kit"
  - title: "The Interplanetary Magnetic Field (IMF)"
    publisher: "SpaceWeatherLive"
    url: "https://www.spaceweatherlive.com/en/help/the-interplanetary-magnetic-field-imf.html"
---

The solar wind is the stream of charged particles and magnetic field that constantly blows out from the Sun. For aurora hunters, three numbers matter most: how fast it travels (speed), how dense it is (density) and which way its magnetic field points (Bz). When Bz points south, meaning it is negative, for a sustained period, the solar wind couples efficiently to Earth's magnetic field and the chance of a strong aurora rises. The measurements come from spacecraft parked between Earth and the Sun, which give you roughly 15–60 minutes of warning.

## What the solar wind is

The solar wind is a thin plasma, mostly protons and electrons, flowing out of the Sun's outer atmosphere, the corona. It carries the Sun's magnetic field with it, known as the interplanetary magnetic field (IMF). According to the Norwegian encyclopedia Store norske leksikon, its speed at Earth's distance is usually between 200 and 700 kilometres per second, averaging about 400. Its density is typically a few particles per cubic centimetre, and its magnetic field about 5 nanotesla, roughly 10,000 times weaker than the magnetic field at Earth's surface.

The solar wind is not uniform. NOAA describes two main types:

- **Slow solar wind**, around 400 km/s, the normal state in the plane where Earth orbits the Sun.
- **Fast solar wind from coronal holes**, typically 500–800 km/s. Coronal holes are regions on the Sun where the magnetic field is open, so the plasma escapes more easily.

On top of that come coronal mass ejections (CMEs), huge clouds of plasma and magnetic field thrown out in eruptions. They can travel from under 250 to nearly 3,000 km/s and cause the strongest storms. Read more in our article on [geomagnetic storms](id:geomagnetic-storms).

## Why Bz is the number that matters most

The magnetic field in the solar wind has a direction. Scientists split it into components, and Bz is the north–south one relative to Earth's magnetic field. Earth's field points north on the day side of the magnetosphere. When the solar wind's field points the opposite way, south (negative Bz), the two fields can link up and energy from the solar wind gets into the magnetosphere. Store norske leksikon puts it simply: a southward field couples better than a northward one.

NOAA says the same about storms: what drives them is long periods, several hours, of fast solar wind and above all a southward magnetic field. A brief dip below zero rarely produces much. Duration is what counts.

Bt is the total strength of the magnetic field, whatever its direction. It tells you how much potential there is: a high Bt means Bz could become strongly negative if the field swings south.

## How to read the real-time plots

NOAA shows solar wind data in an interactive plot, and many apps pull the same numbers. The plot usually shows the magnetic field (Bt and Bz) at the top and the plasma (density, speed and temperature) below. Here are some rules of thumb. They are not official thresholds, just a starting point:

| Measurement | Quiet | Promising | Strong |
|---|---|---|---|
| Bz | positive or around 0 | steadily negative, e.g. −5 nT or lower | −10 to −20 nT or lower, sustained |
| Bt | around 5 nT | above 10 nT | above 20 nT |
| Speed | around 300–400 km/s | 500–600 km/s | above 700 km/s |
| Density | a few per cm³ | a clear increase | a sharp jump, often at a shock |

The Bt thresholds come from the website SpaceWeatherLive, which counts above 10 nT as moderately strong and above 20 nT as strong. NOAA's own plot has a setting that highlights periods with Bz below −5 nT, which hints at where "interesting" usually starts. The rest of the table is experience-based and unverified against an official source, not a scientific threshold.

Look for patterns, not single data points:

1. **A shock**: speed, density and Bt jump abruptly at the same time. That often means a CME or a compression region has arrived.
2. **Bz turning south and staying there**: a continuous spell of negative Bz, say half an hour or more, is far more promising than a brief excursion (a rule of thumb, not an official limit).
3. **High speed for several hours**: typical of a coronal hole stream. It often brings aurora several evenings in a row.

## The spacecraft at L1 and the warning you get

The solar wind is measured by spacecraft at Lagrange point 1 (L1), about 1.5 million kilometres from Earth towards the Sun. According to NOAA, DSCOVR has supplied data since 2016 and NASA's ACE since 1998. Two new sources arrived in 2026: NOAA's SOLAR-1, launched on 24 September 2025 and settled into its final orbit at L1 on 23 January 2026, and NASA's IMAP. They will eventually take over from ACE and DSCOVR.

Because the spacecraft sit "upstream", they see the solar wind before it reaches us. NOAA says this gives 15 to 60 minutes of warning, depending on the speed. A quick calculation shows why: 1.5 million kilometres divided by 400 km/s is just over an hour, while fast solar wind at 800 km/s takes about half an hour.

A few caveats are worth knowing:

- The spacecraft measures at a single point. The solar wind that actually hits Earth can differ slightly.
- Data can drop out for a while, and NOAA may switch which spacecraft is the primary source.
- Even with perfect conditions, the magnetosphere often takes some time to load up before it releases the energy in a substorm. Favourable solar wind means higher odds, not a guarantee.

## From solar wind to aurora above you

Solar wind data describes conditions out in space. Whether you actually see anything also depends on whether you are under the auroral oval, whether it is dark enough and whether the sky is clear. In Northern Norway even a moderate solar wind can produce a lovely aurora because you are already close to the oval. Further south you usually need a stronger and longer-lasting southward Bz to push the oval down towards you.

A good evening routine combines three things: the [Kp index](id:kp-index) for the big picture, solar wind data for the next hour and a weather forecast for cloud cover. That is exactly what our guide to [reading an aurora forecast](id:read-forecast) and the apps in our [overview of data sources](id:data-sources) help with.

## In short

- The solar wind has three key measures: speed, density and the direction of its magnetic field (Bz).
- Sustained negative Bz is the key. High Bt and high speed amplify the effect.
- The measurements come from L1, about 1.5 million km away, and give 15–60 minutes of warning.
- Use the solar wind to decide when to go out and the weather forecast to decide where. [Check tonight's verdict for your location](app:).
