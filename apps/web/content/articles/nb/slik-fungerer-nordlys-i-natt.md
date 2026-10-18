---
id: how-this-site-works
lang: nb
slug: slik-fungerer-nordlys-i-natt
title: "Slik fungerer Nordlys i natt?: JA, KANSKJE eller NEI"
description: "Slik kombinerer Nordlys i natt? Kp-varsel, skydekke og mørke til JA, KANSKJE eller NEI, hva svaret ikke tar med, og hvordan varsler og personvern virker."
category: forecast
published: 2026-10-18
updated: 2026-10-18
summary: "Bak svaret JA, KANSKJE eller NEI ligger tre åpne datakilder og noen enkle, åpne regler. Her er hvordan vurderingen gjøres, hvor den kan ta feil, og hva som skjer med stedet ditt."
faq:
  - q: "Hva betyr JA, KANSKJE og NEI?"
    a: "JA betyr at minst én mørk time det neste døgnet ventes å ha nok nordlysaktivitet for breddegraden din og under 40 prosent skydekke. KANSKJE betyr et nesten-treff. NEI betyr at mørke, aktivitet eller skyer mangler."
  - q: "Tar Nordlys i natt? hensyn til månen?"
    a: "Nei. Vurderingen bruker Kp, skydekke og hvor høyt sola står. Månelys, bylys og utsikten mot nord må du vurdere selv."
  - q: "Lagrer Nordlys i natt? hvor jeg er?"
    a: "Stedet du velger huskes i nettleseren din. Bruksstatistikken på serveren tar bare vare på en grov breddegrad, og bruker ingen informasjonskapsler. Velger du push-varsler, lagres stedet avrundet til omtrent en kilometer."
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
  - title: "Tussmørke"
    publisher: "Store norske leksikon"
    url: "https://snl.no/tussm%C3%B8rke"
  - title: "Web Push for Web Apps on iOS and iPadOS"
    publisher: "WebKit"
    url: "https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/"
  - title: "Tips on Viewing the Aurora"
    publisher: "NOAA Space Weather Prediction Center"
    url: "https://www.swpc.noaa.gov/content/tips-viewing-aurora"
---

Nordlys i natt? svarer på ett spørsmål: er det verdt å se etter nordlys der du er det neste døgnet? Svaret, JA, KANSKJE eller NEI, bygger på tre ting: hvor mye nordlysaktivitet som er varslet, om himmelen blir klar, og om det blir mørkt nok. Reglene er enkle og åpne, og her forklarer vi dem, sammen med det svaret ikke tar med.

## De tre signalene

For hver time det neste døgnet vurderer appen tre forhold for akkurat det stedet du har valgt:

1. **Mørke.** Appen regner ut hvor høyt sola står time for time. En time regnes som mørk når sola er mer enn 6 grader under horisonten, det vil si etter det som kalles borgerlig tussmørke. Når sola er mer enn 12 grader under horisonten (etter nautisk tussmørke), regnes himmelen som enda mørkere. Finnes det ingen mørke timer i det hele tatt, slik det er under midnattssola, blir svaret NEI. Mer om mørke og tidspunkter i [beste tid på natten](id:best-time-of-night).
2. **Nordlysaktivitet.** Appen bruker NOAAs Kp-varsel, som er delt i tretimersblokker, og velger verdien som ligger nærmest i tid for hver time. Den sammenlignes med hvor høy Kp som trengs på din breddegrad.
3. **Skyer.** Appen henter totalt skydekke fra Meteorologisk institutt for stedet ditt, time for time. Under 40 prosent regnes som klart nok. Mangler skyvarselet for en time, regnes timen som overskyet, for sikkerhets skyld.

## Hvor høy Kp trengs?

Jo lenger nord du er, desto lavere aktivitet trengs, fordi nordlysovalen vanligvis ligger over Nord-Norge. Appen bruker denne tabellen:

| Breddegrad | Kp som trengs | Eksempler |
|---|---|---|
| 67° N og nordover | 1 | Tromsø, Alta, Lofoten |
| 64–67° N | 2 | Bodø, Helgeland |
| 62–64° N | 3 | Trondheim |
| 60–62° N | 4 | Bergen, Sogn |
| 58–60° N | 5 | Oslo, Stavanger |
| Sør for 58° N | 6 | Kristiansand |

Dette er tommelfingerregler, ikke eksakt fysikk. Bakgrunnen står i [Kp-indeksen forklart](id:kp-index).

## Fra timer til svar

- **JA:** Minst én mørk time har både nok Kp for breddegraden og skydekke på 40 prosent eller mindre. Appen viser da den beste av disse timene.
- **KANSKJE:** Ingen time er helt god, men minst én mørk time er et nesten-treff: Kp er høyst ett trinn under det som trengs, og skydekket er 70 prosent eller mindre.
- **NEI:** Alt annet. Appen oppgir hva som stopper det: at det ikke blir mørkt, at aktiviteten er for lav, eller at det blir for mye skyer selv om aktiviteten hadde holdt.

For å velge beste time gir appen hver mørk time en poengsum fra 0 til 100. Margin på Kp teller 45 prosent, hvor klart det er teller 35 prosent, og hvor mørkt det er teller 20 prosent. Det er bare en rangering av timene, ikke en sannsynlighet for å se nordlys.

Kartet viser i tillegg NOAAs OVATION-oval, som beregner nordlysets plassering og styrke de neste 30 til 90 minuttene ut fra målt solvind. Ovalen er med for at du skal se situasjonen, men brukes ikke i selve JA/KANSKJE/NEI-vurderingen.

## Hvor ferske er dataene?

Kp-varselet og ovalen hentes fra NOAA Space Weather Prediction Center, og skyvarselet fra Meteorologisk institutt, som stiller dataene fritt til rådighet. Appen mellomlagrer dataene i noen minutter, omtrent 10 minutter for NOAA og 15 minutter for MET, for å være skånsom mot kildene. MET oppdaterer sine nordiske varsler hver time. Les mer om kildene i [apper og datakilder](id:data-sources).

## Hva svaret ikke tar med

Svaret er så godt som dataene bak, og noe ser appen ikke:

- **Månen.** NOAA påpeker at fullmåne får nordlyset til å virke svakere. Appen tar ikke med månelys.
- **Bylys og terreng.** Gatelys, fjell i nord eller en trang dal kan ødelegge utsikten selv med JA.
- **Kp er grov.** Kp er et globalt snitt over tre timer. Kraftige utbrudd kan komme og gå innenfor en enkelt blokk, og varsler mer enn et døgn fram er usikre.
- **Skydekket gjelder ett punkt.** Varselet sier noe om stedet ditt, ikke nødvendigvis om himmelen lavt i nord, der nordlyset står når du bor lenger sør.

Et NEI betyr derfor ikke at nordlys er umulig, og et JA er ingen garanti. Se [skydekke og klarvær](id:clouds-weather) og [slik leser du nordlysvarselet](id:read-forecast) for hvordan du kan sjekke selv.

## Push-varsler: bare når du ber om det

Du kan få beskjed når det blir JA for stedet ditt. Det er helt frivillig, og appen spør aldri om tillatelse til varsler når du åpner siden. Først når du trykker på knappen for å abonnere, forklarer appen hva du får, og først etter det ber nettleseren om lov.

Slik oppfører varslene seg:

- Appen sjekker forholdene for stedet ditt omtrent hvert 20. minutt.
- Du får bare varsel når svaret er JA, og høyst én gang per seks timer så lenge det fortsatt er JA.
- Det sendes ingen varsler mellom klokka 02 og 06 norsk tid.
- Du kan når som helst slå av varslene i appen.

På iPhone og iPad virker push-varsler fra nettsider bare når siden er lagt til på Hjem-skjermen, fra iOS og iPadOS 16.4. Appen viser deg hvordan.

## Personvern

Nordlys i natt? er laget for å vite minst mulig om deg:

- **Ingen informasjonskapsler.** Selve appen bruker ingen cookies. Antall besøk telles på serveren, uten at noe lagres på enheten din for det formålet.
- **Stedet ditt.** Du velger sted ved å søke eller ved å trykke på «Bruk min posisjon». Posisjonen hentes bare når du ber om det. Stedet huskes i nettleseren din, slik at du slipper å velge det på nytt. For å beregne varselet sendes koordinatene til serveren. I bruksstatistikken lagres bare en grov breddegrad, avrundet til hele grader, altså omtrent 111 kilometer.
- **Varsler.** Abonnerer du på push-varsler, lagres stedet avrundet til omtrent en kilometer, sammen med språket ditt og det tekniske varselabonnementet fra nettleseren. Melder du deg av, slettes abonnementet.

Personvernsiden har oppdaterte detaljer. Vil du prøve, kan du [sjekke varselet for der du er](app:).

## Kort oppsummert

- JA, KANSKJE og NEI bygger på Kp-varsel, skydekke og solhøyde for stedet ditt, time for time det neste døgnet.
- JA: mørkt, nok Kp for breddegraden og høyst 40 prosent skyer. KANSKJE: nesten.
- Måne, bylys og terreng må du vurdere selv.
- Varsler kommer bare hvis du ber om det, høyst hver sjette time, og ikke om natten.
