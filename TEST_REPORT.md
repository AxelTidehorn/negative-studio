# Beta 3.9 – resultat och verifiering

21 oktober 2026. Jämförelse mot oförändrad Beta 3.8, med samma motivområden. Ingen mätning av absolut färgriktighet på kalibrerat filmfärgkort har genomförts.

## Reproducerat RAW-importfel

LibRaw-Wasm 1.6.0 accepterar inte tvåelementsvärdet `gamm:[1,1]` i den levererade bindningen trots att typdeklarationen beskriver två värden. Det ger i praktiken standardtonkurvan. Detta var fel även i appens tidigare märkning av RAW som linjärt.

Ett syntetiskt CFA-DNG med känt första värde 3000 ger 11476 med den gamla inställningen och 3000 med `gamm:[1,1,0,0,0,0]` i kamera-RGB. Med gammal inställning var medianförhållandet vid halverad ljusstyrka cirka 0,680; med rätt inställning cirka 0,500. Testet läser verklig LibRaw/WASM-utdata och kontrollerar både det kända värdet och linearitet över många pixelprov.

Primärkällor: LibRaw API:s gammabeskrivning, och upstream-ärendet “Setting gamm requires 6 fields instead of 2”, LibRaw-Wasm #8. Den avgörande verifieringen här är utförd på den faktiskt medföljande WASM-filen.
https://www.libraw.org/docs/API-datastruct.html
https://github.com/ybouane/LibRaw-Wasm/issues/8

Samtliga produktionsvägar för RAW-bild och RAW-ljuskällereferens är korrigerade. Tvåelementsinställningen ersattes även i de relevanta verkliga filtesterna.

## Ny färgmetod

Varje kanal omvandlas till logaritmisk transmission. 1,5- och 98,5-percentiler inom motivet, med 1,8 % inre marginal, bestämmer kanalernas ändpunkter. Kurvorna normaliseras före gemensam positiv kodning, kreativa profiler och manuella justeringar. Ingen fast varm/magenta-kompensation och ingen neutralisering av motivets RGB-medelvärde används. Antagandet om användbara kanaländpunkter kvarstår och är inte en universell färgkalibrering.

Den kontrollerade syntetiska uppsättningen innehåller svart/vitt, fyra neutrala nivåer och separata färgprov med olika respons i R/G/B. Summan av neutralprovens kanalavvikelser minskar från cirka 0,516 till mindre än 0,000001. Kända färgprov återges inom 0,000002 på skala 0–1. Dessa tal gäller den angivna syntetiska modellen, inte färgfel på verkliga fotografier.

Utan källklippning är resultaten stabila vid −2, −1, 0 och +0,3 EV. Kanalvisa skalningar och potenskurvor ger överensstämmande utdata i den kontrollerade formatmodellen. Godtyckliga tonkurvor, lokal redigering, färgmatriser och klippning omfattas inte av det invariansresultatet.

## Verkliga bilder

Följande avkodades: `_DSF9237(1).RAF`, `_DSF9237.dng`, `_DSF9237.tif`, `_DSF9243(1).RAF`, `_DSF9243.tif`, `_DSF9235.RAF`, `_DSF8983.RAF`, `_DSF8434.tif`.

Motiv: gul buss med neutrala ytor, människor/hud/grönska, porträtt med blå kläder, inomhusmotiv med fönster, samt snö/arkitektur. Jämförelsen visar mindre cyan på de två TIFF-motiven, mer neutral ljus återgivning i snöbilden och generellt varmare RAF-återgivning. Alla motiv är inte neutrala och något absolut facit saknas; varmare är inte i sig ett kvalitetsmått.

Bussens TIFF och DNG registrerades geometriskt med bildstruktur (korrelation cirka 0,991) för en jämförelse av samma motivyta. Det gemensamma urvalet är 49 669 pixlar utan extrema utvärden i något av lägena. Måttet är per pixel största skillnaden mellan sRGB-kanalerna efter normalisering med kanalernas summa; det dämpar ljushetens inverkan och är INTE Delta E eller färgriktighet mot en scenreferens.

| Matchad DNG/TIFF | Beta 3.8 | Beta 3.9 |
|---|---:|---:|
| Median för normaliserad kanalskillnad | 0,1884 | 0,1017 |
| 90-percentil för samma mått | 0,2389 | 0,1465 |
| Median för största vanlig sRGB-kanalskillnad | 0,3373 | 0,2863 |

Medianen för det relativa färgmåttet minskar cirka 46 %. TIFF och DNG matchar fortfarande inte exakt. Registrering, förhandsvisningsupplösning och tidigare TIFF-bearbetning begränsar slutsatsen. Detta kan inte generaliseras till alla format/kameror.

## Filmruta och arbetsflöde

Den nya detektorn väljer den centrala rutan i syntetiska remsor i båda orienteringarna. På verkliga bilder minskar inblandningen av intilliggande rutor. Heuristiken är inte en kalibrerad sannolikhet och kräver visuell kontroll vid osäkerhet.

Den nya neutralpipetten justerar positivets färgreglage. Tester säkerställer att kalibrering och ROI inte ändras och att en kontrollerad grön avvikelse korrigeras åt rätt håll. Projekttester kontrollerar nya motorval och att gamla RAW-referenser inte tyst återanvänds i den korrigerade importkedjan.

## Export, prestanda och testgränser

Fullstor `_DSF9237(1).RAF` gav 6032×4032 och 145 926 896 byte som 16-bitars RGB-TIFF med sRGB-profil. Ett exporterat pixelprov stämmer inom ett 16-bitars steg med samma direkta färgfunktion som preview. Exportberäkningen tog 3 s på testdatorn efter RAW-avkodningen. Detta är inte en iPad-mätning.

Tester: syntax/smoke, 14 rena motortester, 20 integrationstester, 10 regressionstester från 3.8, 9 nya färg-/arbetsflödestester, projektimport, 30 fixtures för den äldre färgfunktionen, export under samtidiga inställningsändringar och verklig LibRaw/DNG-linearitet. Worker och direktväg jämförs. Den äldre färgfunktionen är bevarad, men samma korrigerade RAW-import används i samtliga lägen i 3.9.

Safari/iPad, en bred uppsättning kameror och en kalibrerad fotografisk referens återstår. Klippta avkodade kanaler kan inte återskapas av denna färgmotor. Starkt färgdominerade motiv och snävt tonomfång kan fortfarande kräva korrigering. Privata original- och jämförelsebilder ingår inte i uppdateringspaketet.
