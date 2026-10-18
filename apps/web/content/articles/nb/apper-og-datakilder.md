---
id: data-sources
lang: nb
slug: apper-og-datakilder
title: "Nordlysapper og datakilder: hvor tallene kommer fra"
description: "NOAA, Meteorologisk institutt, Yr og norske observatorier står bak nesten alle nordlysapper. Slik bruker du kildene direkte og vurderer en app."
category: forecast
published: 2026-10-18
updated: 2026-10-18
summary: "Bak de fleste nordlysapper ligger noen få åpne kilder: NOAA for romvær, MET og Yr for skyer, og norske observatorier for målinger. Slik bruker du dem, og slik skiller du god app fra dårlig."
faq:
  - q: "Hvor kommer dataene i nordlysapper fra?"
    a: "Som regel fra NOAA Space Weather Prediction Center for Kp, solvind og nordlysovalen, og fra en værtjeneste som Meteorologisk institutt for skyer. Noen bruker også norske magnetometre og allsky-kameraer."
  - q: "Finnes det norske nordlysvarsler?"
    a: "Ja. Norsk senter for romvær ved UiT i Tromsø viser blant annet nordlysvarsel for de neste timene for flere norske steder, allsky-kameraer og målinger fra magnetometre. Yr viser nordlysaktivitet sammen med skyvarselet."
  - q: "Hvordan ser jeg om det er nordlys akkurat nå?"
    a: "Allsky-kameraer, som fotograferer hele himmelen, viser hva som skjer. Norsk senter for romvær har kameraer i Tromsø og Skibotn som oppdateres jevnlig om natten."
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
  - title: "Tromsø – Andre varsler"
    publisher: "Yr (NRK og Meteorologisk institutt)"
    url: "https://www.yr.no/nb/andre-varsler/1-305409/Norge/Troms/Troms%C3%B8/Troms%C3%B8"
---

Det finnes mange nordlysapper, men de fleste bygger på de samme få kildene: amerikanske NOAA for romvær, Meteorologisk institutt for skyer, og norske observatorier for målinger i nord. Kjenner du kildene, kan du sjekke dem selv når det gjelder, og du ser raskt forskjell på en app som er ærlig om usikkerheten og en som bare lover nordlys.

## NOAA: romværet for hele kloden

Space Weather Prediction Center (SWPC) i den amerikanske værtjenesten NOAA er den kilden de fleste nordlysapper henter romværdata fra. Her finner du blant annet:

- **Estimert Kp**, beregnet fortløpende fra magnetometre i flere land, og tredagersvarselet for Kp. Se [Kp-indeksen forklart](id:kp-index).
- **OVATION-ovalen**, et kart over hvor nordlyset ventes å være de neste 30 til 90 minuttene, beregnet fra solvinden målt ved likevektspunktet L1 rundt 1,6 millioner kilometer fra jorda.
- **Solvinddata** med hastighet, tetthet og magnetfeltets retning (Bz). Se [solvind, Bz og hastighet](id:solar-wind).
- **Vaktvarsler, varsler og alarmer** når geomagnetisk storm er ventet eller pågår.

Dataene er offentlige og finnes også i maskinlesbar form. Det er derfor så mange apper viser de samme Kp-tallene. Hvordan du leser produktene steg for steg, står i [slik leser du nordlysvarselet](id:read-forecast).

## Norsk senter for romvær og observatoriet i Tromsø

Norge har lang tradisjon for nordlysforskning. Norsk senter for romvær (NOSWE) forteller at Kristian Birkeland i 1910 fikk regjeringen med på å opprette et permanent nordlysobservatorium på Haldde ved Alta, etter NOSWEs beskrivelse verdens første. Det var i drift fra 1912 til 1926, og i 1928 ble virksomheten flyttet til et nytt observatorium i Tromsø (mer om Alta i [nordlys i Alta og Finnmark](id:finnmark)). I dag heter det Tromsø geofysiske observatorium (TGO) og er en del av UiT Norges arktiske universitet.

TGO driver ifølge NOSWE en kjede på totalt 19 magnetometre over fastlands-Norge, Sverige og Barentshavet, i tillegg til ionosonder, riometre og allsky-kameraer. NOSWE ble opprettet i 2014 i samarbeid med Norsk romsenter, som en egen avdeling under TGO, og ble i 2019 regionalt varslingssenter for romvær i Norge i det internasjonale nettverket ISES.

For nordlysjegere er dette det mest nyttige på NOSWEs nettsider:

- **Nordlysvarsel for de neste 1 og 4 timene** for blant annet Svalbard, Tromsø, Trondheim, Bergen og Oslo. Varselet bruker programvaren SvalTrackII, utviklet av professor Fred Sigernes ved Kjell Henriksen-observatoriet (UNIS) på Svalbard, og finnes også som mobilapp.
- **Kp-varsel for omtrent den neste timen**, beregnet fra solvinddata målt ved L1.
- **Allsky-kameraer** i Tromsø og Skibotn, som viser hele himmelen og oppdateres hvert annet minutt om natten. De er slått av mellom klokka 05 og 16 UT, og tidene oppgis i UT.
- **Magnetometerdata og et geomagnetisk sammendrag** for Tromsø og Dombås, som omtrent representerer nordlige og sørlige Norge.

Magnetometerkurvene fra TGO er dessuten tilgjengelige i sanntid. Når kurvene svinger kraftig, er det uro i magnetfeltet, og ofte nordlys.

## Meteorologisk institutt og Yr

Skydekket er like viktig som romværet, og her er Meteorologisk institutt (MET) den sentrale kilden. MET tilbyr værdata fritt gjennom sitt åpne API under en Creative Commons-lisens, også for kommersiell bruk. Mange nordlysapper henter skyvarselet sitt herfra.

For deg som bruker er Yr, et samarbeid mellom NRK og MET, den enkleste veien inn. Under «Andre varsler» for et sted viser Yr nordlysaktivitet, Kp-indeks og skydekke fordelt på høye, middels og lave skyer og tåke. I tillegg ser du solens og månens høyde, månefase og nettkameraer i nærheten. Se [skydekke og klarvær](id:clouds-weather) for hvordan du bruker skyvarselet.

## Hvilken kilde svarer på hva?

| Spørsmål | Beste kilde |
|---|---|
| Blir det storm de neste dagene? | NOAAs tredagersvarsel og vaktvarsler |
| Hvor ligger nordlysovalen den neste timen? | OVATION fra NOAA, nordlysvarselet fra NOSWE |
| Er det skyfritt der jeg er i kveld? | Timesvarselet på Yr, med skylagene |
| Skjer det noe akkurat nå? | Allsky-kameraer og magnetometre fra TGO/NOSWE |
| Lønner det seg å gå ut, alt i alt? | En app som kombinerer alt, for eksempel Nordlys i natt? |

## Slik vurderer du en nordlysapp

Mange apper ser like ut, men de kan skille seg mye fra hverandre. Still disse spørsmålene:

- **Oppgir appen kildene?** En god app sier hvor Kp, solvind og skydata kommer fra, og når de sist ble oppdatert.
- **Tar den hensyn til skyer og mørke?** En høy Kp midt på dagen eller under tett skydekke er verdiløs der du står. En app som bare viser Kp, gir halve bildet.
- **Skiller den mellom målt og varslet?** Observert Kp de siste timene og varslet Kp for i morgen er to forskjellige ting.
- **Er tidene i lokal tid?** NOAA bruker UT. En app som ikke regner om, kan forskyve kvelden med en eller to timer.
- **Forklarer den prosentene?** «70 prosent sjanse» betyr lite hvis appen ikke sier hva det er sjanse for.
- **Er varslene fornuftige?** Push-varsler hver halvtime for Kp 3 i Oslo er støy. Gode varsler kommer når det faktisk er verdt å gå ut.
- **Respekterer den personvernet ditt?** Et nordlysvarsel trenger stedet ditt, ikke hele livet ditt. Sjekk hva appen lagrer og deler.

## Slik gjør Nordlys i natt? det

Nordlys i natt? bruker de samme åpne kildene: Kp-varselet og OVATION-ovalen fra NOAA SWPC, skyvarselet fra MET, og en egen beregning av hvor høyt sola står der du er. Kart og stedssøk kommer fra Kartverket. Appen setter dette sammen til ett svar: JA, KANSKJE eller NEI, med beste time og begrunnelse. Detaljene, og begrensningene, står i [slik fungerer Nordlys i natt?](id:how-this-site-works). Du kan [sjekke varselet for der du er](app:) direkte.

## Kort oppsummert

- NOAA SWPC står for romværet: Kp, OVATION, solvind og varsler.
- MET og Yr står for skyene, og Yr viser nordlys og skylag side om side.
- Norsk senter for romvær og TGO i Tromsø har norske nordlysvarsler, allsky-kameraer og magnetometre.
- En god app viser kildene, regner inn skyer og mørke, bruker lokal tid og er ærlig om usikkerheten.
