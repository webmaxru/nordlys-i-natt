---
key: privacy
title: "Personvern og informasjonskapsler"
description: "Hvilke opplysninger Nordlys i natt? behandler, hvorfor, hvor lenge de lagres, hvilke tredjeparter som er involvert, og hvordan annonser og samtykke håndteres."
updated: 2026-10-20
---
Nordlys i natt? er laget for å samle så lite data om deg som mulig. Her forklarer vi hva som behandles når du bruker nettstedet, hvorfor, og hvilke valg du har.

**Behandlingsansvarlig:** Maxim Salnikov, Norge. Kontakt: <!--email--> (flere muligheter på [kontaktsiden](page:contact)).

## Kort fortalt

- Ingen innlogging og ingen brukerkontoer.
- Vi bruker ikke informasjonskapsler (cookies) og ingen sporing på tvers av nettsteder.
- Posisjonen din brukes til å beregne varselet og lagres ikke på serveren – med mindre du selv slår på nordlysvarsler.
- Besøk telles samlet på vår egen server, uten informasjonskapsler.
- Det vises ingen annonser i dag. Hvis vi tar inn annonser fra Google, blir du spurt om samtykke først der loven krever det (se under).

## Hva som behandles, og hvorfor

### Posisjon og varsel

Når du velger et sted, enten via enhetens posisjon, stedsøk eller en forhåndsvalgt by, sender nettleseren breddegrad og lengdegrad (avrundet til fire desimaler) til vår server. Serveren henter Kp-varsel fra NOAA og vær- og soldata fra Meteorologisk institutt, og regner ut svaret. Koordinatene brukes bare til dette og lagres ikke. Grunnlag: at du har bedt om tjenesten (berettiget interesse / avtale).

### Lagret på din enhet

Nettleseren lagrer valgt sted, valgt språk og siste varsel lokalt (localStorage), slik at siden åpner raskt neste gang. Dette blir på din enhet og sendes ikke til oss. Du kan slette det ved å tømme nettstedsdata i nettleseren. Appen bruker også en service worker for å fungere offline.

### Nordlysvarsler (frivillig)

Du kan få varsel dagen før en god sjanse for nordlys på tre måter. For alle tre lagrer vi stedet du valgte (avrundet til to desimaler, omtrent én kilometer), stedsnavnet, språk, varselinnstillingene dine og når vi sist sendte varsel, i Azure Table Storage i Norge. Grunnlaget er ditt samtykke (personvernforordningen art. 6 nr. 1 bokstav a), og du kan trekke det tilbake når som helst.

- **Nettleser (push):** push-abonnementet fra nettleseren din. Varselet leveres via nettleserleverandørens push-tjeneste (for eksempel Google, Mozilla eller Apple). Slår du av varslene, slettes abonnementet.
- **E-post:** e-postadressen din. Vi sender først en e-post med en bekreftelseslenke (dobbel bekreftelse); uten bekreftelse sender vi ingenting mer, og ubekreftede adresser slettes etter sju dager. E-post sendes med Azure Communication Services fra Microsoft, med data lagret i Norge/EU. Vi måler ikke åpninger eller klikk. Hver e-post har en lenke for å avslutte med ett klikk og en lenke til innstillingene dine; avslutter du, slettes adressen med en gang. Én adresse kan ha varsel for inntil fem steder.
- **App (iPhone/Android):** en push-token for telefonen. Varselet leveres via Apple Push Notification service eller Google Firebase Cloud Messaging. Slår du av varsler i appen, slettes tokenet.

Vi bruker opplysningene bare til å sende nordlysvarsler, deler dem ikke med andre og bruker dem ikke til reklame. Påmeldingsskjemaet har enkel beskyttelse mot roboter (begrensning av antall forsøk og et skjult felt), uten informasjonskapsler.

### Besøksstatistikk

Serveren teller sidevisninger (hvilken side som ble åpnet) og hvilke svar som ble gitt, med en grov breddegrad avrundet til hele grader (omtrent 111 km). Dette sendes til Microsoft Azure Application Insights. Vi bruker ingen informasjonskapsler eller klientskript til statistikk, og vi lagrer ikke full IP-adresse i statistikken. Grunnlag: berettiget interesse i å drifte og forbedre tjenesten.

### Serverlogger

Som alle nettsteder mottar serveren tekniske opplysninger som IP-adresse og nettlesertype når siden lastes. Disse brukes kun til drift og sikkerhet og slettes fortløpende i henhold til driftsleverandørens rutiner.

## Tredjeparter nettleseren din kontakter

Noen funksjoner henter data direkte fra offentlige kilder. Da ser disse kildene IP-adressen din, slik de gjør ved alle nettforespørsler:

- **Kartverket** – stedsnavnsøk (ws.geonorge.no) og kartfliser (cache.kartverket.no).
- **Microsoft Azure** (Norge øst) – drift av nettstedet og lagring.
- **agentprose.cloud** – et lite skript på alle sider som gjør innholdet lesbart og brukbart for KI-assistenter og nettleseragenter (WebMCP). Det setter ingen informasjonskapsler og sporer deg ikke på tvers av nettsteder. Ifølge leverandøren registreres bare anonym bruksstatistikk med en tilfeldig ID per sidevisning, og IP-adresser lagres ikke.

## Annonser og informasjonskapsler fra Google

Det vises ingen annonser på nettstedet i dag. Vi vurderer å bruke Google AdSense for å dekke driftskostnader. Hvis annonser blir slått på, gjelder dette:

- Tredjepartsleverandører, inkludert Google, bruker informasjonskapsler til å vise annonser basert på dine tidligere besøk på dette og andre nettsteder.
- Googles bruk av annonseinformasjonskapsler gjør det mulig for Google og partnerne å vise deg annonser basert på besøk på dette og/eller andre nettsteder.
- Du kan velge bort personlig tilpasset annonsering i [Googles annonseinnstillinger](https://adssettings.google.com/), eller velge bort andre leverandørers informasjonskapsler på [aboutads.info](https://www.aboutads.info/choices/).
- Les [hvordan Google bruker opplysninger fra nettsteder som bruker Googles tjenester](https://policies.google.com/technologies/partner-sites).
- Besøkende i EØS, Storbritannia og Sveits blir bedt om samtykke gjennom en sertifisert samtykkeløsning (CMP) før informasjonskapsler for annonser settes. Du kan endre eller trekke tilbake samtykket når som helst via lenken som da vil vises nederst på siden.

Denne siden oppdateres med dato før annonser tas i bruk.

## Dine rettigheter

Du har rett til innsyn, retting, sletting, begrensning og å protestere mot behandling, og rett til å klage til [Datatilsynet](https://www.datatilsynet.no/). Fordi vi ikke har brukerkontoer, kan vi som regel ikke knytte data til deg. Varsler sletter du selv: slå av push i nettleseren eller appen, eller bruk avmeldingslenken i e-posten. Ta [kontakt](page:contact) hvis du har spørsmål.

## Endringer

Vi oppdaterer denne erklæringen når tjenesten endres. Datoen øverst viser siste endring.
