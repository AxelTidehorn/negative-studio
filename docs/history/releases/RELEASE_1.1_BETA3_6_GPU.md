# FILMLABB 1.1 Beta 3.6 – GPU-prototyp 1

## Prova

Ersätt källfilerna i repositoryts rot och behåll befintlig `.github/workflows`.
Bygg/publicera som tidigare med `npm ci` och `npm run build`. Sidfoten ska visa
**1.1 Beta 3.6 · GPU-prototyp** efter omladdning. Inget har publicerats här.

Öppna en bild med standardmotorn. **GPU** eller **CPU** visas bredvid visningslägena.
Under **Info → Förhandsvisning** kan du välja GPU med automatisk reserv eller CPU
för att jämföra samma bild och inställningar. Valet sparas på enheten, separat
från bildjusteringar och projekt. Vid ett GPU-fel visas orsaken under Info.
Välj CPU och sedan GPU igen för att försöka på nytt.

För en praktisk jämförelse: prova samma RAW-fil på iPad och dator, dra exponering,
kontrast och färgreglagen, byt profil och jämför CPU-läget. Kontrollera även
beskärning, rotation, pipetter och export med egna bilder. Prototypen avser
förhandsvisningen; RAW-avkodning, bildanalys och export sker med befintlig CPU-kod.

## Implementerat

- WebGL 2-förhandsvisning för standardmotorn, Neutral, de aktuella kreativa
  färgprofilerna och svartvita profilerna. Samtliga befintliga tonreglage och
  positiva återgivningar går genom shaderns matematiska färgkedja.
- Positiv, negativ och delad jämförelsevisning. Befintlig geometri för filmruta,
  zoom, panorering och rotation används även av GPU-ytan. Den ursprungliga
  canvasytan tar fortfarande emot pipettklick.
- Linjära Float32-källvärden laddas till en RGB32F-textur. Shadern använder highp
  och närmaste källpixel. Ingen nedkvantisering till 8 bitar eller halvprecision
  av källans färgvärden före färgberäkningen.
- Vid reglageändringar uppdateras uniformer; samma källtextur återanvänds.
  Visningen samordnas med animation frames. Under dragning startar längsta sidan
  på 700 pixlar; efter 180 ms vila renderas upp till 1400. Om GPU-tidsmätning är
  tillgänglig anpassas dragupplösningen inom 400–1400 pixlar. Utan sådan mätning
  används 700/1400. Ursprungliga bilddata ändras inte.
- Histogram räknas på begränsade CPU-prover i separat worker efter 220 ms vila.
  Om workers saknas eller fallerar finns en mindre beräkning efter vila. Inga
  fullständiga GPU-bilder läses tillbaka i reglagens renderingsslinga.
- En liten CPU/GPU-färgkontroll körs vid ny bild, profil eller återgivning.
  Avvikelse över två visningsnivåer ger CPU-reserv. Kontrollen använder en liten
  readback, som är skild från redigeringsloopen.
- Automatisk CPU-reserv vid saknat WebGL 2, otillräcklig precision, fel vid
  program-/textur-/visningsallokering, misslyckad färgkontroll eller förlorad
  grafikanslutning. Återställd grafikanslutning kan återaktivera GPU.
- Jämförelsemotorn och äldre färgprofilversioner som inte stöds använder CPU.
- Ett tidigare initieringsfel rättades: `makeExportCanvas` tilldelades utan
  deklaration i ett strikt skript. Det gav ReferenceError i riktig webbläsare,
  trots att VM-testharnessen accepterade koden. Funktionen deklareras nu korrekt.
- Byggskript och offline-cache inkluderar GPU-modulerna.

## Verifierat

`npm test` och `npm run build` passerar. Den befintliga CPU-regressionstestsviten
inkluderar färgmotor, äldre profiler, analys, schemaläggning, 72 TIFF-fixtures och
48 kombinationer av förberedd exportberäkning.

En riktig Chromium-webbläsare körde WebGL 2-shadern genom ANGLE/SwiftShader
(mjukvarurendering):

- 64 pixeljämförelser: 15 profiler × två tonlägen × två reglagekombinationer,
  samt negativ/delad visning och nedskalning med udda bilddimensioner.
  Maximal avvikelse mot direkt CPU-beräkning: **1 av 255 visningsnivåer**.
- Reglageändringar återanvänder källtexturen och gör inte om bildanalysen.
- Appens vanliga PNG-import aktiverar GPU utan JavaScript-fel.
- Rotation/zoom ger identisk CSS-geometri för CPU-/GPU-ytorna; GPU-ytan fångar
  inte pipettens pekarhändelser.
- Byte mellan CPU/GPU ger byte-identiska TIFF-exporter. Den riktiga
  webbläsarens JPEG-kodare ger en giltig JPEG-signatur.
- Förlorad WebGL-anslutning växlar till CPU och återställning aktiverar GPU igen.
- Byte till jämförelsemotorn använder CPU; återgång till standard aktiverar GPU.
- Tömning av kön tar bort GPU-bilden och frigör resurserna.
- 390 pixlars touch-layout kan importera och justera med GPU.
- Simulerat saknat WebGL respektive misslyckad färgkontroll ger användbar
  CPU-förhandsvisning.

Resultat: `docs/gpu-browser-results.json` och `docs/gpu-browser-beta3.6.log`.

## Begränsningar

Detta är en funktionsverifierad prototyp, inte en verifierad prestandavinst på
fysisk hårdvara. SwiftShader-resultaten säger inte hur snabbt integrerad grafik
eller en iPad kör samma kod. Safari/iPad och fysiska mobiler är ännu inte testade.
Mobiltestet verifierar layout och händelser i Chromium, inte verkligt mobilminne,
energiförbrukning eller värmeutveckling. Inga riktiga kamerafiler ingår i de nya
GPU-webbläsartesterna; shaderjämförelserna använder syntetiska linjära bilddata.

CPU beräknar med högre numerisk precision än GPU. En liten skillnad i visningen
är möjlig; exporten använder alltid CPU-motorn. Histogrammet är provbaserat och
uppdateras efter vila. Enheten behöver stöd för WebGL 2 och användbar highp-
precision; annars används CPU automatiskt. Den första shaderkompileringen och
färgkontrollen kan ge en kort paus vid import eller profilbyte.
