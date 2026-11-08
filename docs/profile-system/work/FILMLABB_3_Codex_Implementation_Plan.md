# FILMLABB 3.0 · Codex Implementation Plan

## PR 1 · Ersätt systemet

**Kopierbar startprompt**

> Arbeta i AxelTidehorn/negative-studio. Läs FILMLABB_3_Profile_System_Architecture.md, FILMLABB_3_Profile_Library.json och FILMLABB_3_Visual_Acceptance_Matrix.csv. Kontrollera aktuell main och #89. Ersätt hela den kreativa profil- och printkedjan i ett atomiskt byte. Inför en datadriven operator på positivt sRGB med samma kontrakt i CPU och WebGL2. Neutral är valbar och Gold/Ektar används i QA. Radera äldre profiler, profildispatch, print, gamla projektfält och estetiska fixtures. Nya projekt använder nytt format. Separera svartvit källa från kreativ stil. Behåll relevanta tekniska konverterings-, geometri-, cache- och exporttester. Visa numerisk paritet, verkliga Neutral-exporter före/efter och vilka gamla ägare som försvann. Använd repots versionspolicy för ett nytt synligt betaversionsnummer. Leverera en reviewable PR.

- **Scope och moduler.** Använd render-core.js, gpu-renderer.js, configuration.js, ny profile-engine.js och katalog, projekt/queue, UI, worker-/byggmanifest. Flytta syncEngineSelector före radering av profile-settings.js. Testa alla aktiva motorkombinationer i normal appväg. Utgå från D-receptet på aktuell PR #89-gren för fotografiska prov. Håll en eventuell merge eller rebase skild från lookimplementeringen.
- **Körordning.** Frys neutrala exporter per motor. Bygg CPU, GPU och worker. Kör Gold/Ektar som testdata i samma väg som Neutral. Byt UI/format och radera gammal ägare i samma PR. Skanna aktiv kod för creativeVersion, profileVersion, printStyle och NSCreativeProfiles. Redovisa legitima återstående tekniska referenser.
- **Grind.** JSON-facit på 23 patchar och fyra styrkor. 17³ gamutgrid, gråramp, 0 %, hue-kontinuitet, GPU-fallback, histogram, cache, export och nytt projekt. Gammalt projekt avvisas före tillståndsändring. PNG16/TIFF16 verifieras bytevis mot samma floatkernel och kvantisering. JPEG provtas före komprimering. Följ SYS-RGB. Kör verkligt svartvitt negativ.
- **Bilder.** Neutral före/efter på 05 kök, 09 snö och 11 porträtt. Om privat källa saknas, dokumentera likvärdig behörig fixture och vilket krav den täcker. Hela motiv och identiska utsnitt.
- **Risk.** Dubbel profilblandning, oavsiktlig ändring i Standard/BW, cachemiss vid varje stilbyte och otillgängliga worker-moduler.

## Separat teknisk grind · D

D finns nu på [PR #89 vid bb9829b](https://github.com/AxelTidehorn/negative-studio/blob/bb9829b8c58228370d7e70bde146654f5f0e4ed5/docs/V2_APPROVED_D_INTEGRATION.md) som luminance-matched-D-1. Main saknade denna commit vid slutkontrollen. Återanvänd receptet och dess analys-/cacheidentitet. Koden finns i render.js, platform.js, fast.js och gpu.js. Rapporten på grenen anger byteidentisk TIFF för 05 mot tidigare D-referens, och 11 matchade punktgaller. Verifiera med Neutral på 05/09/11 och ny lågnyckelserie. Fönstrets P99-marginal är 0,0406 mot B:s 0,0602. Inom samma filmcrop har A, B och D enligt integrationsrapporten 12 pixlar med kanalvärde 65535. Håll bedömning av lokal fönstertextur separat från ändpunktsräkningen. Testa nya looks mot både A och faktiskt integrerad D före slutligt val.

## PR 2 · Ektar 100 och Gold 200

- **Scope och moduler.** Katalog, visuella QA-fixtures och gruppen Filmkaraktärer. Använd samma lookoperator och strengthsnapshot.
- **Bilder.** Samma negativa serie vid 0/35/70/100 %. Ektar med röd jacka, gränsnära röd skylt, två blå nyanser och hud. Gold med ockra, olivgrönt, himmel och varm interiör. På egen stock jämför lägsta användbara styrka. Testa också korsvis och använd 05/09 som extrema fall.
- **Grind.** E-RED/E-BLUE/E-HIGH, G-YELLOW/G-OLIVE/G-SKIN och SYS-NATIVE. Läs textur och detalj separat. Flagga mer än 0,1 procentenhets ökning i RGB16-ändpunktsandel i ljus ROI. Prova iPad Safari och Edge med 30 uppvärmda profilbyten och fem RGB16-exporter per väg. Föreslagen budget mot bas är +15 % för p95 profilbyte och +25 % för CPU RGB16-export.
- **Risk.** Färggräns vid redan starkt blått eller rött, och dubblerad gul värme på native. Välj värden på riktiga exporter före ordinarie publicering.

## PR 3 · Pro 400H och Portra, samt separat Pro Image-försök

- **Scope.** Katalog och fotografisk uppföljning. Justera en styrande parameter åt gången och redovisa lågt/mellan/högt.
- **Bilder.** Matchade porträtt med flera hudtoner, rödare kinder, blad i sol/mulet, gult objekt, blå textil och grå/vit referens. Lås EV, V2-intent och utsnitt under profiljämförelsen. Visa A0/A70/D0/D70 på samma negativa fil när båda positiva finns.
- **Grind.** F-GREEN/F-WHITE/F-WARM, P-SKIN/P-LOW/P-COOL. Panel enligt SYS-DESIGN. Två osedda bilder från en annan rulle före beslut. Visa både motivet och native RGB16-utsnitt med hud och högdagrar.
- **Pro Image.** Fotografera samma röd/gul/blå kontroll med Gold, Pro Image och Portra. Lås två dokumenterade inverteringar och jämför 0,04/0,07/0,10 i röd C-fraktion på gemensam bas. Följ I-RED/I-DIST. Behåll hold om igenkänning uteblir.
- **Risk.** Scanvariation större än profileffekt. En allmän kontrast- eller färgökning kan ge synligare skillnad utan att stärka filmidentiteten.

## PR 4 · Kreativa och slutlig städning

- **Scope.** Asfaltblå, Kritpapper, Koppartryck via befintlig operator. Grupperna visas i profilkortet. Testa i18n, tangentbord, reset, exportlås, kö, mobil och roundtrip. Endast en aktiv lookmodell.
- **Bilder.** Blå ström och varm LED, snö/arkitektur/vitt tyg och röd metall/tegel. Jämför uttrycken med Ektar i blått, Pro 400H i ljushet respektive Gold i gul/röd separation.
- **Grind.** Varje C-test på två scenfamiljer och panelbedömning. Gör slutlig kodinventering av gamla definitioner, printfunktioner och fixtures. Behåll tekniska assertions i blandade testfiler.
- **Risk.** Två looks kan konvergera i svaga motiv. Jämför på gemensam input med både tydlig och subtil färg.

## Granskningspaket

1. Källhash, stock och C-41 när kända, renderrecept, lookdata-hash, styrka, inställningar, backend, exporthash och ICC. Lås ROI i normaliserad källa och ange exportens koordinater, rotation och sampling.
2. Fullbild och oskalade utsnitt av samma områden i RGB16. Skapa kontaktark med tydlig Neutral. Om privata filer används förvaras de privat och delas som behörig granskningsbilaga.
3. Slumpa variantordning och skilj på träff, preferens och fel. Visa global bild innan ROI. Läs hud, ljus textur, djup skugga och huvudkulörer. Kontrollera 35 % och 70 %, och 100 % som stresstest. Logga fynd och nästa parameterändring.
4. Redovisa commit, testkommandon och toleranser. Välj profilrevision först när både fotografisk grind och teknisk paritet passerat.
