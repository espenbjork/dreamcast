# 🌙 Dreamcast

POC av en podcastavspiller laget for å sovne til — finn åpne podcaster, miks
naturlyder og atmosfæreeffekter på toppen av stemmen, og la en sleep-timer
fade alt ut når du har sovnet.

## Funksjoner

- **Søk** i Apples åpne podcast-katalog (iTunes Search API, gratis, ingen auth).
- **Favoritter** lagres lokalt i nettleseren (localStorage).
- **Avspilling** med ±15 s skip, scrubbing og volumkontroll.
- **Effekt-studio** med seks prosedyrelt genererte lydlag — ingen lydfiler
  nødvendig, alt syntetiseres i sanntid via Web Audio API:
  - 🌧 Regn (filtrert brun-støy + tilfeldige dråper)
  - 🌊 Hav/bølger (LFO-modulert brun-støy)
  - 🍃 Vind (band-pass-filtrert rosa-støy med sweep)
  - 💧 Bekk (high-pass-filtrert støy + bobler)
  - 🔥 Peis/bål (lav-pass støy + tilfeldige knitre-pop)
  - 🌬 Vifte (jevn brun-støy med svak modulasjon)

  Hver effekt har egen **volum**- og **intensitets**-slider.
- **Sleep-timer** (15/30/45/60 min) som fader både podcast og effekter
  lineært ned til null over 30 sekunder før stopp.

## Kjøre lokalt

Ingen byggesteg. Bare åpne `index.html` i en moderne nettleser:

```bash
open index.html      # macOS
xdg-open index.html  # Linux
start index.html     # Windows
```

Eller bare dobbeltklikk filen i Finder/Explorer.

## Egen proxy (kreves for å laste episoder)

De fleste podcast-hoster (inkl. `podkast.nrk.no`) sender ikke
`Access-Control-Allow-Origin`, så nettleseren får ikke hente RSS-feedene deres
direkte. Gratis offentlige CORS-proxyer pleide å fikse dette, men de er nå enten
nede eller krever registrering. Løsningen er en bitteliten proxy du selv eier —
en gratis [Cloudflare Worker](https://workers.cloudflare.com/):

1. Lag en gratis Cloudflare-konto (om du ikke har en).
2. Deploy worker-en (åpner nettleser for innlogging første gang):

   ```bash
   npx wrangler deploy
   ```

   Wrangler skriver ut URL-en, f.eks. `https://dreamcast-proxy.ditt-navn.workers.dev`.
3. Lim URL-en inn i `index.html` — variabelen `MY_PROXY` øverst i `<script>`:

   ```js
   const MY_PROXY = "https://dreamcast-proxy.ditt-navn.workers.dev";
   ```

Appen prøver din egen proxy først og faller tilbake på de offentlige hvis den
mangler. Worker-en (`worker.js`) er låst til egne origins via `ALLOWED_ORIGINS`
slik at den ikke blir en åpen proxy hvem som helst kan misbruke — legg til flere
origins der om du hoster appen et annet sted enn `espenbjork.github.io`.

## Hvordan det fungerer

- **Søk** treffer `itunes.apple.com/search?media=podcast` direkte (CORS-vennlig).
- **RSS-feeds** hentes via en CORS-proxy fordi de fleste podcast-hoster
  blokkerer cross-origin requests. Appen prøver din egen Cloudflare Worker
  (`MY_PROXY`) først og faller tilbake på offentlige proxyer (`corsproxy.io`,
  `allorigins.win` m.fl.). Se [Egen proxy](#egen-proxy-kreves-for-å-laste-episoder).
- **Podcast-lyden** spiller direkte gjennom `<audio>`-elementet (ikke via
  Web Audio API), fordi de fleste lyd-hoster ikke setter `Access-Control-Allow-Origin`
  som ville trengs for å rute audio gjennom `MediaElementSource`.
- **Effektene** mikses inn via Web Audio API som en separat lydgraf — master
  gain styrer dem under sleep-timer-fade.

## Kjente begrensninger (det er en POC)

1. **De offentlige fallback-proxyene er ustabile.** Derfor følger det med en
   egen Cloudflare Worker (`worker.js`) — sett opp den (se over) for pålitelig
   henting. Uten en fungerende proxy får man ikke episode-listen.
2. **Filtre på selve podcast-lyden er ikke mulig** uten CORS-tillatelse på
   audio-hosten. Effektene legges *på toppen* av podcasten.
3. **Ingen autoplay på neste episode**, ingen kø, ingen progresjon lagret.
4. **Lyd-effektene er syntetiske** — ikke ekte feltinnspillinger. Bra for en
   POC fordi det er null filstørrelse, men en utgivelse ville vurdert
   ekte sample-baserte loops av høyere kvalitet.

## Stack

- Vanlig HTML/CSS/JS, ingen bibliotek, ingen byggesteg.
- Web Audio API for lyd-syntese og mixing.
- localStorage for favoritter.
- iTunes Search API for søk; egen Cloudflare Worker (+ offentlige fallbacks)
  som CORS-proxy for RSS-feeds.

## Lisens

Ikke spesifisert ennå — fri bruk for eksperimentering.
