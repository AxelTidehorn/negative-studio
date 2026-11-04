# PR A: fotografisk färgåtergivning inom V2

Bas: main `c903689` med #45 och #46. Endast PR A genomförs. Motorval,
äldre motorer, RAW-import, filmbasdetektor, teknisk respons, densitetsmatris,
P60/P99, gamutmodell och Editing 2.0 ändras inte.

## Verifierade orsaker och avgränsning

De fem tidigare RAF-referenserna 04/05/06/09/10 och det befintliga testpaketet
återanvänds. Samtliga ommätta baser matchar arkivet exakt. #46 påverkar inte
denna jämförelse: V2 använder uttryckligt accepterad manuell mätning, inte
den gamla automatcache som #46 korrigerade.

- **RAW/demosaicing:** hela avkodade Rec.2020-bufferten jämfördes mellan
  Originals normala decoderinställningar och V2:s låsta inställningar, före
  Originals sRGB-transformation. Maxfel var **0 för alla fem filer**. Skillnad
  i RAW-avkodning förklarar alltså inte skärpeintrycket på dessa referenser.
  Båda använder kameravitbalans och linjär transfer. Slutsatsen är inte ett
  påstående om alla kameror eller RAW-filer.
- **Färgdomän/inversion:** Original transformerar till sRGB, skalar gemensamt
  med 0,5 och kvantiserar före inversion. V2 inverterar linjär Rec.2020 först.
  Transformation och icke-linjär inversion kommuterar inte. Skillnaderna är
  därför väntade och kan inte bedömas genom rå RGB-jämförelse över domänerna.
  Negativa sRGB-komponenter klipps i Originals import. Detta är faktisk
  informationsbegränsning, men inget verifierat nytt importfel; koden ändras inte.
- **Densitetsmatris:** den befintliga empiriska matrisen är inverterbar
  (determinant 0,194059, konditionstal 3,320). Den ändrar färgseparationen men
  kollapsar inte hela färgdimensioner. Identitetsmatris och halv blandning
  mot identitet gav betydligt mer cyan/blått, särskilt i fönstret och huden.
  Dessa kandidater förkastades. Utan film-/färgkalibreringsdata motiveras ingen
  ny teknisk matris.
- **Modellgränser:** rekonstruktionen kan däremot ge icke-positiv exponering
  nära filmbasen, som begränsas till modellens nedre gräns. Bland behållna
  analysprov hade 05 detta i 260/12325 och 06 i 177/9883 prov, minst en kanal.
  Detta är en verklig gräns i den befintliga modellen, inte information som
  den nya renderingen återskapar. Räkningarna är inte semantisk motivklassning.
- **Positiv färgbalans:** bandvis neutralisering ändrar samma färgs
  kanalkvoter olika vid olika luminans. I 05 var blågain 1,3163 i mitten men
  0,9586 vid den godkända högdagerreferensen. Det kyler den varma interiören.
  Att stänga av all färgbalans behåller värme men tappar också användbar
  korrigering av högdagrar. Detta är huvudsakligen annorlunda återgivning;
  den positiva balansen är reversibel före gamut/kvantisering med känt recept.
- **Ton/gamut:** #45:s kontrastkurva ger användbar tonseparation. Samma kurva
  behålls. Gamutkompressionen minskar avsiktligt kromatik nära sRGB-gränsen;
  klippning/projektion och slutlig kvantisering kan förlora information.
  Ett alternativ med relativ kromatikkompression gav ingen tydligt bättre
  helhet på utvecklingsbilderna och införs inte. Ingen global mättnadsökning,
  temperaturförskjutning, filmprofil eller ny kreativ korrigering införs.

## Implementerad kandidat

**Fotografisk 2**, `photographic-global-terminal-1`, använder den redan
analyserade, kvalificerade P90–P98,5-referensens gain gemensamt över hela
luminansområdet. Alla befintliga stöd-, spridnings-, tvetydighets- och
bandöverensstämmelsekrav behålls; ingen ny neutraldetektor eller numerisk
tröskel tillkommer. Om `terminal.selected` inte är sann behålls den historiska
bandbalansen, med diagnostisk fallback `NO_SUPPORTED_TERMINAL_ANCHOR`.
Identitetsbalans förblir identitet.

Detta är ett fotografiskt val av uppskattad belysningsreferens, inte uppmätt
vitbalans eller ny filmkalibrering. Samma positiva diagonal används vid alla
intensiteter; luminansen normaliseras tillbaka precis som tidigare. Därmed
bevaras relativa kromatiska skillnader över luminans bättre än när olika
ljusa ytor neutraliseras separat. En statistisk neutralhypotes kan fortfarande
vara fel. Gamutmodell, exponering och #45:s tonkurva är oförändrade.

Originalets `colorCorrection` sparas oförändrat i intent. `prepareBalance`
tar fram den faktiskt applicerade modellen; både skalär CPU, worker och
export använder den. Diagnostiken redovisar applicerade gains,
`application: global-terminal` eller `historical-band-fallback`, recept och
fallback. Den frysta analysen finns kvar i renderreceptet.

Neutral förblir standard. #45:s fotografiska version 1 behåller exakt sin
gamla matematik. Den nya versionen väljs uttryckligt via befintliga API:er:

```js
// Huvudplattformen, efter val av V2 algoritm 3:
FILMLABB_V2.setRendering('photographic', {version: 2});
FILMLABB_V2.snapshot().recipe.intent.tone; // luminance-photographic-2
FILMLABB_V2.setRendering('photographic', {version: 1}); // #45
FILMLABB_V2.setRendering('neutral');

// Befintliga labbet:
await NSV2Lab.setPhotographic(true, {version: 2});
await NSV2Lab.setPhotographic(true); // #45, oförändrad API-standard
await NSV2Lab.setPhotographic(false);
```

Inga nya UI-reglage eller motorval införs i PR A. Valet sparas i befintligt
projektrecept och behålls vid omanalys/basbyte. Okänd rendering avvisas före
projektmutation; äldre appar avvisar den nya tonidentifieraren. Teknisk
algoritmversion är fortsatt 3. Appversionen hanteras av befintlig byggprocess.

## Fotografisk verifiering

05/06 användes för utveckling. Regeln frystes före kandidatens kontroll av
04/09/10, SHA256 `8f6ed3587aaf04be3a3dba47e8c2b658d951281ba0bc61b87f5308508619b1b8`.
Ingen efterföljande parameterjustering gjordes. Alla fem har setts historiskt;
det är inte ett oberoende valideringsmaterial. Filmtyperna är okända.

Kontaktkartan visar **Original, Standard, V2 neutral algoritm 3, #45 och
Fotografisk 2**. Original/Standard genereras i den riktiga isolerade huvudappen
med egna automatiska analyser och normala Editing 2.0-inställningar. V2 har
identisk Rec.2020-källa, accepterad bas, analysområde, exponering, visningscrop
och neutral kreativ redigering. Färgdomäner och kalibrering skiljer mellan
de äldre motorerna och V2; referenserna är inte ett kolorimetriskt facit.
V2:s befintliga neutral/#45-översikter återanvänds, med kontrollerade recept.
De nya slutöversikterna använder samma area-sampling efter konvertering.

| Bild | Bedömning mot #45 |
|---|---|
| 04 porträtt, kontroll | Liten varmare förändring i huden; användbar jacksvärta kvar |
| 05 kök, utveckling | Tydligast förbättring: mindre kall/grå hud och mer bibehållet varmt rumsljus; fönstrets små blå/lila fläckar kvar |
| 06 soffa, utveckling | Mindre förändring; något varmare hud och rum, bibehållen blå/tygseparation |
| 09 snö, kontroll | Något varmare snö/vatten; kan uppfattas bättre men neutralfacit saknas. Fortfarande mörkare än Original/Standard |
| 10 par, kontroll | Mindre cyan i hud, vita kläder och mörka partier; grönt/blått avviker fortfarande från Original |

Kandidaten är en verifierad, avgränsad förbättring av grundåtergivningen
framför allt i 05/10. Den är inte visad generellt överlägsen, och löser inte
hela V2:s färgrespons. Därför ersätter den inget befintligt standardrecept.

Tio **512×512 originalpixelutsnitt** jämför samma källkoordinater utan
nedskalning, brusreducering eller skärpning. Mot #45 var största linjära
luminansskillnaden 0,000005891; lägsta cosinuslikhet mellan horisontella
luminansgradienter var 0,999999999911. Detta stödjer bibehållna fina
luminansdetaljer och korn, inte ett påstående om mätt MTF eller större optisk
upplösning. Färgkornets balans kan ändras med gains. Nativejämförelsen stöder
att mycket av skärpeintrycket mot Original handlar om ton-/färgseparation;
någon generell upplösningsöverlägsenhet är inte verifierad.

Befintlig neutral och #45 jämfördes dessutom med main-koden på samma frysta
recept: **max pixelavvikelse 0** i 775 källprov per bild och renderingsläge.
Exponering och median luminans efter ton är oförändrade för alla fem.
Antalet sRGB-ändpunkter kan ändras något när färger flyttas mot gamutgränsen;
ingen förlorad källsignal återställs. Se mätfilen för omfattning/precision.

Bilder, förutsättningar och lossless native-PNG sparas i den befintliga privata
Drive-strukturen, aldrig i Git. [Privat kontaktkarta](https://drive.google.com/file/d/1sx1sSbaB8J2Sz7sEf7JxcK0x64DvSVQS/view).
[Privat bildpaket med lossless utsnitt och jämförelseförutsättningar](https://drive.google.com/file/d/1ELXITsXwMJ7Fz-HUANrbRZUiitv9wLFY/view).

## Regression och reproduktion

Lokal fullsvit på Node 24.22.1/Chromium: **106/106 grupper passerade**,
284,95 sekunder. Även separat build och `git diff --check` passerade.
GitHub Actions kör samma fullsvit på Node 22 vid PR-verifiering.

Nya riktade tester täcker gemensam gain, invarianta kanalkvoter över
intensitet, oförändrad luminans/ton, fallback, historiska recept, versionering,
basbyte/ångra, återläsning och faktiskt applicerad diagnostik. Worker och
huvudplattform exporterar JPEG/RGB16-TIFF med det nya receptet; orakelfelet är
0 kodsteg i browser-fixturen. Alla visningslägen, rotationer och area-sampling
kontrolleras mot Float64-oraklet inom 1 RGB16-kodsteg.

Verklig 04-export: **3719×3678**, RGB16-TIFF med 588 byte sRGB-ICC, JPEG
skapad, 0 kodstegs fel i kontrollerade referenspunkter. Sex extra headerbyte
jämfört med #45 kommer från #46:s TIFF-fix. Den privata JPEG-kontrollen
använder Canvas; huvudplattformens vanliga JPEG-väg testas separat i browser.
Full källbuffert är 291852288 byte, åttaraders RGB16-rand 178512 byte;
ingen extra fullstor floatbild skapas. Detta är buffertstorlekar, inte en
mätning av total minnespeak.

```sh
npm run test:full
node tools/v2-response-validate.mjs PACKAGE ORIGINALS PRIVATE_OUTPUT 04,05,06,09,10 --photographic-color --candidate-only --export04
```

Det utökade befintliga verktyget kan köra endast kandidaten och återanvända
sparade referenser. Fysisk iPad Safari/Windows Edge, nya filmtyper och
nattbilder är inte verifierade. Inget material för nattbilder finns i serien.
Fortsatt bättre teknisk färgrekonstruktion kräver mätta referenser och bredare
kontrollerade motiv; denna PR påstår inte emulsionsriktig återgivning.
