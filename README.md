# FILMLABB 1.0 Beta 3.8

## Installera

Packa upp och lägg innehållet i katalogen i projektroten. Kör `npm ci`, `npm test`, `npm run build` och publicera hela `site/` via den befintliga GitHub Actions-processen. Ett färdigt `site/` ingår också. `sw.js` använder en ny cache för 3.8. Det här paketet har inte publicerats till den befintliga webbadressen.

## Vad som ändrats

- Standardläget **Beta 1 · korrigerad analys** använder linjära motivvärden innanför vald filmruta. Vit ljuskälla eller svart ram utanför motivet används inte som fallback-filmbas. Säker oexponerad filmkant kan fortfarande mätas separat.
- RAW, ICC-TIFF och JPEG normaliseras till samma linjära domän före den korrigerade färgberäkningen. Det innebär en avsiktlig ändring av tidigare JPEG-resultat.
- Ljuskällereferensen når nu den korrigerade färgvägen. Samma gain appliceras på motiv och filmbas. Med uppmätt bas kan korrektionen därför matematiskt förkortas bort; en aktiv referens ska inte automatiskt tvinga fram en synlig färgförändring.
- **Beta 3.7 · oförändrad referens** bevarar den äldre färgberäkningen. 30 sparade jämförelsefall från originalet ger samma resultat. Gamla Beta 1-byggens importkedja är inte identisk med 3.7.
- **Beta 3.8 · densitet och kanallutning (test)** är en valbar försöksvariant med separata röda/blå kanallutningar. Den har inte slagit referensen visuellt och är inte standard. Kanallutningarna finns under Avancerad konvertering; 1,00 är neutralt. Ingen fast varm/magentaförskjutning har införts.
- Färgberäkningen för preview körs i en Worker där det stöds. Reservväg finns. Vid reglageändring används 700 px för snabb respons och 1400 px när ändringen avslutas. Färgmetod och kalibrering är gemensamma med exporten.
- Histogrammet byggs av redan beräknade bildvärden. Det läser inte tillbaka hela visningscanvasen.
- Teknisk export-LUT kan återanvändas även med kreativa profiler och Shadows/Highlights. Kanalblandande och tonala steg beräknas efter LUT:en med samma pixelkod. Den helt separerbara neutrala vägen har en extra slutlig LUT.
- Språksystemet översätter ändrade noder i stället för att gå igenom hela gränssnittet vid varje textändring. Fem språk, tema, rotation, arbetskö och filmbasreferenser finns kvar.

## Testa

1. Importera en RAF, kontrollera och bekräfta filmrutan. Automatisk identifiering kan fortfarande ta med intilliggande rutor; justera vid behov.
2. Jämför standardläget med **Beta 3.7 · oförändrad referens**, med Neutral kreativ profil. Kontrollera hud, skuggor och neutrala ytor.
3. Prova reglage och exportera 16-bitars TIFF. Kontrollera att färgerna stämmer mot preview och att rotation/exportbeskärning blir rätt.
4. På iPad: kontrollera att reglage svarar medan preview uppdateras, att senaste ändringen visas och att köbyte inte visar ett gammalt färgjobb.

TIFF-färgsticket är fortfarande olöst. Att använda samma interna format kan inte automatiskt ta bort tonkurvor och färgändringar som redan bakats in i en TIFF. De tillhandahållna TIFF-filerna matchar ännu inte RAF/DNG. Se `TEST_REPORT.md` för verifiering och begränsningar.

## Verifiering

`npm test` kör syntaxkontroller, 14 rena motortester, 20 integrationstester, 10 tester för 3.8 samt export med samtidiga inställningsändringar och 30 jämförelsefall mot 3.7. `node tests/raw-fixture.mjs` verifierar verklig LibRaw-avkodning av en syntetisk DNG. `node tests/i18n-static.mjs` kontrollerar språk och att byggd HTML stämmer med källan efter byggning.

Privata originalbilder ingår inte. Frivilliga verkliga filtester:

```sh
node tests/real38.mjs /sökväg/till/original /sökväg/till/testutdata
node tests/full-raf-export.mjs /sökväg/till/bild.RAF
```

Safari/iPad har inte körts i denna testmiljö. Worker- och pixelfunktioner har verifierats i Node; verklig respons, minnesanvändning och filhämtning behöver även kontrolleras på enheten.
