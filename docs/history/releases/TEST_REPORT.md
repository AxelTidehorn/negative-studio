# Beta 4 – jämförelse och testning

Utgångspunkt: oförändrad Beta 3.9 som referens. Testerna skiljer på ny RAW-import, teknisk färgkalibrering och tonåtergivning. Ingen mätning mot ett kalibrerat fotografiskt filmfärgkort har gjorts.

## RAW-import: reproducerbar informationsvinst

På `_DSF9237(1).RAF` avkodades samma data genom riktig LibRaw-Wasm 1.6.0 med sex korrekta gammavärden. Fem alternativ prövades: sRGB, sRGB med halverad ljusstyrka, Rec.2020, kamera-RGB och ett experiment med egna WB-multiplikatorer. Det sista experimentet försämrade blå kanal och används inte.

I en fördefinierad central rektangel med 50 875 prov var 4 011 röda prov klippta vid sRGB-avkodning, medan Rec.2020 gav noll klippta prov där. Halverad ljusstyrka sänkte de tidigare klippta värdena men återskapade inte variationen.

Över hela 500 px-förhandsvisningen hade sRGB-avkodningen 23 153 prov med klippt röd kanal. sRGB med halverad ljusstyrka gav bara fyra olika värden på dessa platser. Rec.2020 konverterat till utökad linjär sRGB gav 23 151 olika värden där; röd kanal varierade ungefär 1,000–1,204 före gemensam halvskala. Detta visar bevarad variation som den tidigare färgrymdskonverteringen förlorade. Det visar inte återställning av sensorklippta värden eller absolut färgriktighet.

Den implementerade vägen använder Rec.2020, en D65-matriskonvertering till sRGB och en fast gemensam faktor 0,5 före 16-bitarskvantisering. Ingen bildberoende kanalnormalisering sker i detta importsteg. RAW-bilder och RAW-ljuskällereferenser använder samma väg. Negativa sRGB-komponenter begränsas till noll; klippning i Rec.2020 och negativa komponenter räknas före konverteringen.

## Verkliga bilder och visuell kontroll

Följande original avkodades igen med nya RAW-vägen: `_DSF9237(1).RAF`, `_DSF9237.dng`, `_DSF9243(1).RAF`, `_DSF9235.RAF`, `_DSF8983.RAF`. De fyra första proven hade inga klippta Rec.2020-komponenter över hela bilden; `_DSF8983.RAF` hade fyra röda och ett grönt klippt pixelprov. Alla filer hade ett mindre antal negativa sRGB-komponenter efter matrisen. Det är inte ett löfte om klippfri RAW-import för andra bilder.

RAF/DNG-paret för samma negativ jämfördes efter 90° orienteringsanpassning på 500 px normaliserade källvärden. Medelabsolut RGB-skillnad var cirka 0,000021; 99-percentilen cirka 0,000168. Detta gäller samma Fuji-källa och är inte ett mått på färgriktighet eller universell formatöverensstämmelse.

Med samma tidigare normaliserade källvärden gjordes även en separat 3.9/4-jämförelse på sju motiv: DNG-bussen, TIFF-bussen, paret i RAF och TIFF, porträtt i blå kläder, inomhusporträtt och snö/arkitektur. Automatisk färg ligger då huvudsakligen nära 3.9; den nya mjuka högdagern är en mindre skillnad.

Med nya RAW-importen ger de fem RAW-proven mindre framträdande grönt/cyan i flera neutrala ytor och hudpartier. Exempelvis kan den blå tröjan och parets vita kläder separeras från det gamla grönsticket bättre. En del färger ändras även i varm riktning. Detta är en visuell bedömning, inte ett färgfacit. TIFF-bilderna har fortfarande egna färgavvikelser och blir inte automatiskt identiska med RAW.

## Teknisk kalibrering och automatiska tester

Nya tester kontrollerar:

- Bekräftad filmruta sparar separat kanalrespons; beskärning ändrar gemensam tonanalys utan att ändra sparade kanalkurvor.
- Två neutrala prov korrigerar en känd syntetisk modell med olika R/G/B-respons även utan neutral motivfördelning. Identiska, klippta och motsägelsefulla prov avvisas.
- Gemensam kalibrering med motsvarande uppmätt filmbas behåller tekniska värden vid ändrad avfotograferingsexponering. Utan en sådan referens är detta inte garanterat för en återanvänd kalibrering.
- En ändrad uppmätt filmbas påverkar teknisk konvertering även med automatiska nivåer. Samma ljuskällekorrektion på filmbas och motiv tar ut sig.
- Kreativ profil och styrka ändrar inte teknisk kalibrering.
- Den mjuka högdagern bevarar positiva linjära RGB-förhållanden före kreativa profiler. Exponering är en gemensam linjär förstärkning under högdagerkompressionen.
- Den gemensamma RGB-tonhanteringen använder inte en felaktig fullständig kanalvis LUT.
- Direkt beräkning, teknisk 16-bitars-LUT, worker-preview och TIFF ger överensstämmande resultat; preview har 8-bitars avrundning.
- Projekt bevarar bildspecifik/gemensam kalibrering, RAW-import och tonval. Ogiltiga kalibreringar används inte. Äldre 3.9-projekt behåller sin gamla RAW-import.
- Byte av RAW-import rensar aktuell bilds inkompatibla källkalibrering och lämnar andra bilder orörda.
- Verklig LibRaw-avkodning av ett syntetiskt CFA-DNG verifierar både linjär gamma och Rec.2020-vägen. Vid oklippta värden överensstämmer skyddad import ×2 med sRGB-vägen inom 2 nivåsteg vid 95-percentilen.

Tidigare motor-, import-, export-, profil-, tema-, rotations-, kö- och projektkontroller från 3.9 körs också. Exporttest under samtidiga inställningsändringar körs med nya standardmotorn. 3.9-färgens syntetiska referenstester och äldre 3.7-fixtures behålls.

## Prestanda

En fullstor 6032×4032-RAF behandlades genom hela nya tekniska pixelvägen till 145 926 144 byte RGB-pixeldata. Med samma tekniska LUT-exportväg och samma källbild tog 3.9 cirka 7,68 s och Beta 4 cirka 10,60 s på testvärden. 500×334-preview tog cirka 64 respektive 114 ms. Detta är CPU-beräkning i Node, efter RAW-avkodning, utan filnedladdning och utan iPad/Safari. 3.9 har dessutom en snabbare fullständig LUT i vissa neutrala inställningar som inte är giltig för den nya gemensamma tonhanteringen. Beta 4 är därför inte en generell prestandaförbättring.

Tekniska kanaltabeller cacheas separat från ton- och profilreglage, och worker-kön är fortsatt begränsad. Full RAW-avkodning i dessa prov tog ungefär 17–21 s inklusive den nya konverteringen. Tiderna gäller testmiljön, inte användarens dator.

## Återstående gränser

Utan neutrala referenser använder den första färguppskattningen fortfarande motivpercentiler. Den kan feltolka stark färgdominans. Att frysa kurvorna förhindrar nya kanalsträckningar vid beskärning, men gör inte en felaktig ursprunglig uppskattning rätt. Manuell ny uppskattning och valfri tvåpunktskalibrering finns därför kvar.

Varken fullständig kameraoberoende färgriktighet, alla filmtyper, godtyckligt bearbetade TIFF/JPEG eller fysiskt iPad/Safari-gränssnitt är verifierat. Programtester är DOM-/WASM-tester; ingen fullständig webbläsarinteraktion har körts här. Gränssnittets struktur, språk, tema och rotation bevaras men behöver användartest.

## Primärkällor till konstruktionen

- RawTherapee Film Negative: relativ kanalrespons och två neutrala prov som kan återanvändas på en rulle: https://rawpedia.pixls.us/film_negative/
- darktable negadoctor: separat ljuskälla, filmbas, tonomfång och positiv återgivning: https://docs.darktable.org/usermanual/development/en/module-reference/processing-modules/negadoctor/
- darktable sigmoid: gemensam RGB-skalning och kontrollerade högdagerövergångar. Beta 4 är en egen, enklare kurva, inte en kopia av sigmoid: https://docs.darktable.org/usermanual/5.6/en/module-reference/processing-modules/sigmoid/
- W3C CSS Color 4: linjära Rec.2020/XYZ/sRGB-matriser: https://www.w3.org/TR/css-color-4/#color-conversion-code
- LibRaw: klippning vid vitbalans/utdata och särskilda skalningsparametrar: https://www.libraw.org/comment/5682
