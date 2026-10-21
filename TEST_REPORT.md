# Beta 3.8: verifiering och öppna frågor

## Färg

Den tidigare standardvägen mätte filmbas i hela bildens yttre band. En syntetisk jämförelse med identiskt motiv/ROI och vit respektive svart omgivning ger nu identiskt motivresultat i den verkliga standardvägen. Linjära och motsvarande sRGB-kodade prov ger överensstämmande kalibrering/utdata inom 0,000002. Kreativa profiler och manuella tonändringar ändrar inte analysen.

Ljuskällans gain når standardvägen. Utan bas och automatisk normalisering ger en kontrollerad gainförändring förväntad effekt. Med uppmätt bas förkortas samma diagonala gain bort i transmissionskvoten; detta är avsiktligt, inte en felaktig utebliven korrektion. Kamerans WB/matris och en mer fullständig ljuskälleprofil är en separat fortsatt fråga.

Referenslägets pixelberäkning matchar 30 fixtures skapade från oförändrad 3.7: linjär/sRGB, fem profiler inklusive BW, positiva tonreglage. Max numerisk skillnad 0. Densitetsvarianten är exponeringsstabil i syntetiska oklippta data. LUT med profiler/tonzoner jämförs mot direkt beräkning; de testade 16-bitarsvärdena är identiska. Exportcachen invalidieras även av exponering/gamma/kontrast.

Verkliga filer: `_DSF9237(1).RAF`, `_DSF9237.dng`, `_DSF9237.tif`, `_DSF9243(1).RAF` importerades för jämförelse. Motiven innefattar gul buss/neutrala ytor och människor/hud/grönska. Standardläget och referensen ligger visuellt nära på RAF/DNG. Densitetsvarianten ger mer cyan och har inte godkänts som färgförbättring. TIFF är fortfarande kraftigt cyan i alla lägen. Jämförelsebilderna är förhandsvisningar, inte färgkalibrerade labbreferenser.

Automatisk filmruta kan omfatta intilliggande rutor. De relevanta jämförelserna kompletterades därför med manuellt valda motivområden. Ingen automatisk detektor har godkänts generellt i 3.8. Export kräver fortsatt bekräftad filmruta.

## Prestanda

En avgränsad Node-jämförelse använde samma normaliserade DNG-förhandsvisning, 334×500 pixlar, fem mätningar efter uppvärmning. Den äldre 3.7-pixelvägen och den nya pixelvägen kördes båda som vanliga JavaScript-funktioner i samma värdprocess, inte med olika VM-kostnad. Färginställningarna var identiska (referensläge), och samtliga utmatningsbyte var identiska.

| Fall | Tidigare median | Ny median |
|---|---:|---:|
| Neutral | 88,2 ms | 22,6 ms |
| Sunday Best med Shadows/Highlights | 293,9 ms | 191,1 ms |

Detta är en isolerad varm pixelberäkning, inte importtid eller en iPad/Safari-mätning. Cacheuppbyggnad, DOM, överföring till Worker och skärmvisning ingår inte i dessa tider. Enhetsrespons måste mätas separat. För stora profiler är beräkningen fortfarande betydande; Worker förbättrar främst gränssnittets tillgänglighet.

Preview skickar källdata till Worker en gång per import. Endast senaste färdiga jobb får visas; det finns högst ett pågående och ett väntande renderjobb. Reglagedrag får en mindre preview och efterföljande slutrender. Export har full upplösning och samma färgkod. RAW-avkodningen var redan i Worker före 3.8. Köbyte avkodar fortfarande RAW igen; ingen stor RAW-cache infördes.

## Utförda automatiska kontroller

Syntax/smoke, 14 rena motortester, 20 integrationstester, 10 nya regressionstester, separat exporttest med samtidiga inställningsändringar, 30 referensfixtures, syntetisk DNG genom verklig LibRaw/WASM, samt i18n/byggparitet. Worker-meddelanden testades med den verkliga worker-koden i en kontrollerad miljö. Ingen verklig Safari/iPad-session har genomförts.

Fullstor RAF→TIFF verifierades efter optimering: 6032×4032 och 145 926 896 byte, korrekt 16-bitars RGB och inbäddad sRGB-profil. Exportberäkningen tog 3 s på testdatorn, utöver RAW-avkodning; ett centralt exportprov stämmer inom ett 16-bitars steg med direkt pixelberäkning. En tidigare iteration tog 15 s och ledde till att onödig kvantisering/kopiering togs bort. Detta är inte en iPad-mätning.

## Kvarstående acceptans

Visuellt godkännande på iPad/Safari, TIFF-matchning, robustare automatisk filmruta och en färgmodell som överträffar referensen över hela testuppsättningen. Den nya densitetsvarianten ska inte ersätta standardmetoden med nuvarande bildresultat. Inga nya RAW-format eller kreativa profiler har införts.
