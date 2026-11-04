# RGB-histogram och redigeringspanel

Utgår från main `8f12029` (inklusive #59). Ingen ändring av konverterings-
eller redigeringsmatematik, RAW-recept, projektformat eller exportkod.

## Histogram

Det befintliga histogram-canvaset visar överlagrade halvtransparenta R/G/B-ytor
och en ljus luminanskurva, med gemensam vertikal skala och färgförklaring.
Statistiken räknas från slutliga RGB8-previewvärden **efter redigering**.
Den tidigare luminansdefinitionen behålls: `0.2126 R + 0.7152 G + 0.0722 B`
på visningskodade värden. Detta är displayrefererad ljushetsstatistik, inte
en fysisk luminansmätning eller RAW-statistik.

- Positiv: aktuell positiv med redigering och kreativa profiler.
- Negativ: visat negativ; kreativa positivjusteringar appliceras inte på negativet.
- Jämförelse: **positiv bild**, tydligt märkt. Negativ och positiv blandas inte
  i histogrammet, och jämförelsens gränslinje påverkar inte statistiken.
- Svart/vitt: kanalvisa andelar prov vid exakt 0 respektive 255 i previewn.
  Dessa är visningsändpunkter och får inte tolkas som sensorklippning.

Området är som tidigare hela färgpreviewn före geometrisk beskärning/rotation.
Zoom, panorering och kompositionsbeskärning ger alltså inte ett utsnittshistogram.
Det är samplad statistik; små klippta områden kan missas.

CPU-vägen utökar befintlig provtagning, ungefär 25 000 och högst 50 000 prov.
Tre nya 256-bin `Uint32Array` kostar totalt **3 072 byte** per resultat och
överförs som buffertar. Ingen ny fullstor bildkopia behövs.
GPU-vägen återanvänder den befintliga fördröjningen på 220 ms och en liten
CPU-worker-rendering av samma frysta recept (160 pixlars långsida, 100 i
workerfritt reservläge). Ingen GPU-readback eller ny histogramrenderingskedja.
CPU/GPU-previewns befintliga numeriska tolerans gäller; histogrammet är ingen
bitexakt mätning av GPU-rastret. Bild-/jobbidentifiering skyddar mot gamla svar.

## Panel och experimentstädning

Histogrammet ligger först. Befintliga reglage grupperas som exponering/ton och
färg. Filmruta och befintliga rotations-/kompositionsfält samlas längre ned.
Bildverktygen ligger kvar över fotografiet; den befintliga **Klar**-knappen
finns nu där också. Kontextfält öppnas och scrollas fram i sidpanelen på iPad
och dator. Pekskärmar får större träffytor. Befintlig återställning och
dubbeltryck på enskilda reglage behålls och förklaras.

| Kontroll | Placering och varför den behålls |
| --- | --- |
| `colorMode4` | Avancerad bildbehandling → Experiment och diagnostik. Sparade Standard-varianter och pixelreferenser behöver fortsatt stöd. |
| `toneMode4` | Samma diagnostiksektion. Äldre tonrecept, export och paritetstester ska fortsatt fungera. |
| `rawMode4` | Endast under diagnostik, för RAW-bilder. Domän-/kompatibilitetstester och äldre projekt behöver valen; inga importstandarder ändras. |
| `previewBackend` | Samma diagnostiksektion; borttagen från det vanliga inställningsflödet. Behövs för GPU-felsökning, kontextförlust och CPU-reservtester. |

Alla fyra behåller sina befintliga ID:n, lyssnare och tillstånd. Inga sparade val
nollställs. Den dubbla RAW-sektionen, dess flyttning vid öppning och överflödiga
kontext-CSS-regler tas bort. Filmbas 2, ljuskälla, flat-field, gemensamma ändringar,
exportformat, teman, språk, kö och riktig sidfooter behålls.

Versionsrutinen är oförändrad: nästa merge till main ger nästa unika beta genom
mainlinjens first-parent-nummer. Byggets version/SHA, footer och offline-cache
följer samma centrala byggidentitet; inget projektschema byts.

## Skärmbilder och verifiering

Endast repositoryts offentliga syntetiska `demo-negative.png` används nedan.

| Skärm | Före | Efter |
| --- | --- | --- |
| iPad liggande, 1024 × 768 | [Före](ui-rgb-editor/before/ipad-landscape.png) | [Efter](ui-rgb-editor/after/ipad-landscape.png) |
| iPad stående, 820 × 1180 | [Före](ui-rgb-editor/before/ipad-portrait.png) | [Efter](ui-rgb-editor/after/ipad-portrait.png) |

`tests/rgb-histogram.mjs` jämför varje kanal med oberoende binräkning från
renderade pixlar för Original/Standard/V2 och redigeringsändringar.
`tests/rgb-editor-browser.mjs` provar riktiga workeröverföringar, GPU/CPU och
workerfri reserv, bildbyte, alla visningslägen, fem språk, större pekytor,
återställning, tom kö, footer och JavaScript-fel. Skärmbilder kan återskapas med
`FILMLABB_UI_SCREENSHOTS=docs/ui-rgb-editor/after node tests/rgb-editor-browser.mjs`.

De 120 frysta RGB8/RGB16-exportfallen är oförändrade. Befintliga projekt-,
export-, versions-, geometri-, tema- och layouttester ingår i fullsviten.
Fysisk iPad Safari och Windows Edge är inte tillgängliga i denna miljö;
respons och touch har verifierats i Chromium med emulerade skärmstorlekar.
