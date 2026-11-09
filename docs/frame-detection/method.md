# Filmgränser och preliminär importbild

Bas: main `0ac89dc` efter #95. Originalet `_DSF9235.RAF` finns i Drive/Fotolab,
50 245 120 byte, SHA256 `ae289e8118ffc91321b19c145c5e815b3562fe4b47fda5c2eae5517439ab0094`.
Det importeras genom appens libraw-wasm/V2-recept. En nedskalad linjär
teknisk preview är ett regressionstestunderlag, inte en fullupplöst RAW-export.

## Granskade metoder och licenser

- [FilmCropper](https://github.com/filmlover-0111/FilmCropper/blob/main/FilmCropper/filmcrop_final_ui_app.py),
  granskad filblob `6ca1570b48baf8fc50612d531d7d6769f63c2955`, MIT, copyright
  filmlover-0111 2026. Faktisk kod: användarvalt Lab-basprov, euklidiskt
  färgavstånd, medianfilter, morfologisk close/open, inverterad mask,
  `findContours`, största giltiga kontur och valbar `minAreaRect`-upprätning.
  Koden begränsar **bildförhållandet till 0,2–6,5**. Detta återanvänds inte.
  Ingen implementation kopieras; FILMLABB använder egna funktioner och ingen
  ny OpenCV-/WASM-dependens. MIT skulle tillåta återanvändning med licenstext.
- [OpenCV shape documentation](https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html):
  komponenter, konturer, konvext hölje och roterad minsta rektangel är generella
  datorseendeprinciper. Vår kombination med gradientriktad Hough-ackumulering,
  linjepassning, korsningshörn och konkurrerande hypoteser är en egen implementation.
- [Negative Lab Pro basics](https://www.negativelabpro.com/guide/basics/): den
  offentliga guiden beskriver separat filmbas-vitbalans och crop/border buffer
  för att utesluta icke-film vid analys. Detta är dokumenterat användarbeteende;
  dess proprietära detektor/färgkod har inte granskats.
- [VueScan Crop](https://www.hamrick.com/vuescan/html/vuesc30.htm#cropbuffer):
  Border utvidgar bilden men ignoreras för färgbalans; Buffer ignorerar inre
  kantpixlar för färgbalans utan att ändra bildens storlek. Det stöder separation
  av export och analys, men säger inte hur VueScans detektor är implementerad.

## Varför #95 inte hittar huvudfallet

Fyra orange sidband krävs. På originalet finns en angränsande bild till vänster,
ett orange band mellan bilderna och en mörk hållare direkt till höger. Bara två
sidor hittas (konfidens 0,30). Säkerhetsläget fungerar men geometrin identifieras
inte. Analysområdet blir då inte automatiskt betrott.

## Isolerat experiment och vald kombination

`frame-detector.js` arbetar på högst 480 px, i normaliserade källkoordinater.
CIELAB beräknas med D65 och rätt XYZ-matris för linjär Rec.2020/sRGB. Homogena
yttre provytor ger flera bakgrundsmodeller utan förvald filmbasnyans. Flera
färgavstånds- och ljushetströsklar, liten morfologisk closing, sammanhängande
komponenter och konvexa höljen ger konturhypoteser.

Kontursegmentering ensam missar originalets sammanhängande bild/hållargräns
och föreslår även byggnadsdetaljer. Därför kompletteras den med riktade
färg-/ljushetsgradienter, Hough-linjer, minstakvadratanpassning och fyra hörn.
Kandidater jämförs med kantstöd, lokala yttre bakgrunder, inre variation och
stöd från flera trösklar/upplösningar. Små inre rektanglar och filmens ytterkant
måste konkurrera med hela fotografiets gränser. Enbart orange färg är aldrig
ett krav. Ingen lista över format, kvot, kvotintervall eller formatpoäng finns.
En minsta provlängd i pixlar är en upplösningsgräns, inte ett bildförhållande.

Fyra tydliga sidor och stabilitet mellan 480/320 px krävs för automatisk tillit.
Tre sidor ger ett markerat osäkert fyrhörningsförslag. Konkurrerande regioner,
upplösningsskillnad och saknade gränser rapporteras separat. Ingen generell
procentbeskärning ersätter evidens. Konfidens är en heuristik, inte en uppmätt
sannolikhet. Ovanlig scenstruktur kan fortfarande ge falska regioner.

`tools/capture-frame-sources.mjs` reproducerar RAW-importen och sparar begränsade
Float32-prov med originalhash, decoderrecept och byggidentitet för jämförelse.
Gamla detektorn fryses endast i `tests/fixtures` för jämförelse.
