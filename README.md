# FILMLABB 1.0 Beta 3.9

## Uppdatera via GitHub

Paketet innehåller endast filer för projektroten. Packa upp ZIP-filen, öppna projektroten på GitHub där `index.html` ligger och ladda upp ALLA uppackade filer samtidigt. Ersätt befintliga filer och committa till `main`. Behåll befintliga undermappar, workflows och Pages-inställningen GitHub Actions.

`npm ci` installerar LibRaw. `npm test` återskapar rätt tests-filer från `test-suite.json` och kör testerna. `npm run build` skapar och uppdaterar `site/`. Du behöver inte skapa eller ladda upp undermappar manuellt. Paketet publicerar inte webbplatsen förrän du själv har laddat upp filerna.

## Nytt i 3.9

**RAW-importen är faktiskt linjär.** LibRaw-Wasm 1.6.0 ignorerar gammainställningen när bara två värden skickas. Tidigare versioner använde därför en tonkurva samtidigt som appen märkte data som linjära. 3.9 skickar sex gammavärden och verifierar inställningen mot kända DNG-värden och halverad exponering. Detta är ett identifierat importfel, inte en estetisk kompensation.

**Ny standardmotor: Beta 3.9 · automatisk färg.** Invertering och kanalnormalisering görs i logaritmisk transmission/densitet. Kanalernas kurvor normaliseras med robusta motivpercentiler och positiv återgivning kommer därefter. Ingen konstant varm eller magentafärgad förskjutning har införts. Färgfördelningen antas inte vara grå i genomsnitt, men de automatiska kanaländpunkterna är fortfarande en uppskattning som kan påverkas av starkt färgdominerade motiv.

**Förbättrad central filmruta.** Detektorn söker efter genomgående filmkantband runt den centrala rutan och använder tidigare kantanalys som reserv. Den är prövad på de tillhandahållna motiven men kan fortfarande behöva manuell korrigering. Markeringen används för analys; exportbeskärning väljs separat.

**Neutralpipett på positiv bild.** Välj en känd neutral mellangrå yta inne i motivet. Pipetten justerar endast Varm/kall och Grön/magenta, med de befintliga reglagens begränsningar. Filmbas och teknisk analys ändras inte. Kreativ profil ingår inte i referensprovet. HUD, himmel och grönt gräs är inte neutrala referenser.

**Klippta RGB-kanaler visas separat.** Uppgiften gäller avkodade bildvärden. Den kan inte ensam avgöra om klippningen skedde i sensorn, RAW-framkallningen eller i en tidigare TIFF-export.

3.8:s Worker-preview, mindre preview under reglagedrag, gemensamma exportfunktion, histogram och export-LUT finns kvar. Kreativa profiler, fem språk, tema, rotation och arbetskö finns kvar.

## Jämför rätt

1. Kontrollera att sidfoten visar Beta 3.9.
2. Välj `Beta 3.9 · automatisk färg` om ett tidigare motorval ligger kvar.
3. Kontrollera filmrutan. Återställ bildreglagen och välj Neutral kreativ profil vid jämförelsen.
4. Jämför med Beta 1/äldre färgmetod. Alla lägen i 3.9 använder den korrigerade RAW-importen; exakt historisk RAW-återgivning kräver det gamla bygget.
5. Kontrollera TIFF-exportens färg, rotation och eventuell exportbeskärning.

Gamla RAW-baserade filmbas-/ljuskällereferenser kan behöva mätas om eftersom de byggde på fel tonkodning. Projekt sparas med kalibreringsversion 39. Vid import av äldre projekt avaktiveras inkompatibla RAW-referenser med ett meddelande; originalprojektfilen ändras inte. Beskärning, profiler och manuella bildreglage kan behållas, men äldre färgjusteringar behöver bedömas på nytt.

## Begränsningar

De tillhandahållna TIFF-filerna har fortfarande inte exakt samma färger som RAW/DNG. På den matchade bussbilden minskar skillnaden tydligt, och den visuella jämförelsen visar mindre cyan på båda TIFF-motiven. Detta är inte bevis för absolut färgriktighet eller alla filmtyper/kameror. En redan bearbetad TIFF kan innehålla kurvor och lokala ändringar som ett gemensamt arbetsformat inte upphäver.

Automatiska ändpunkter kan feltolkas i motiv med begränsat tonomfång eller stark färgdominans. Neutralpipetten är frivillig hjälp, inte ett krav för varje bild. Safari/iPad har ännu inte verifierats på en fysisk enhet i denna testmiljö.

Se TEST_REPORT.md för resultat, testuppsättning och mätmetod.
