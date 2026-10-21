# FILMLABB 1.1 Beta 2

Se [release och root-installation](RELEASE_1.1_BETA2.md), [teknisk genomlysning](docs/TEKNISK_GENOMLYSNING.md), [verifieringsrapport](docs/VERIFIERINGSRAPPORT.md) samt [testmetod och nästa steg](docs/TESTMETOD_OCH_NASTA_STEG.md).

Den kompakta arbetsytan och färgmotorn från Beta 1 är kvar. Sony ARW går genom samma RAW-färgväg. Begränsningar och faktiska tester redovisas i rapporten; suffixet ARW innebär inte generell kamerakompatibilitet.

```sh
npm ci
npm test
npm run build
```

Publicera site/ med din befintliga GitHub Actions-installation. Bevara .github/ när du uppdaterar källfilerna. Kör appen via HTTP(S). Npm-paketet libraw-wasm är fortsatt låst till 1.6.0. Projekt innehåller inställningar, inte originalbilder.

---

Följande är historisk Beta 1/Beta 4-dokumentation, inte nya verifieringsresultat. Vid motstridighet gäller Beta 2-rapporterna ovan.

## Korrigering av bildytan (1.1 Beta 1 – layoutfix)

- Visningen använder höjden som återstår i fönstret, i stället för en hårdkodad uppskattning av headerns höjd.
- Anpassa/fokus tar hänsyn till 90°/270° rotation och storleken räknas om när panelerna ändras.
- Teknisk bildinformation finns kvar i utfällbara Bildinformation / tekniska detaljer; inga bildparametrar ändras.
- Root-installation är oförändrad: ladda upp platta filer i roten; GitHub Actions kör npm ci och npm run build, vilket kopierar LibRaw till site/.
- Den här leveransen innehåller ingen färdig site eftersom LibRaw inte ingick i käll-ZIP och pakethämtning inte kunde fullföljas i testmiljön.
- Kontrollera filmbeskärningsram, zoom/rotation och bildstorlek på Edge och iPad efter deployment.

# FILMLABB 1.1 Beta 1

1.1 Beta 1 innehåller den uppdaterade arbetsytan med separat bildkö, större bildyta, döljbara paneler och fokusläge. Färgmotorn från Beta 4 och jämförelselägena är bevarade.

## Installera via GitHub

Packa upp `FILMLABB_1.1_beta1_root_update.zip`. Ladda upp **alla filer samtidigt i projektroten**, där `index.html` ligger, och ersätt befintliga filer. Behåll `.github`, `tests`, `site` och befintlig GitHub Pages-konfiguration. Du behöver inte skapa några nya undermappar manuellt. ZIP-filen innehåller bara filer på en nivå; ladda upp även `workspace.js`, som styr det nya gränssnittet.

Detta paket använder samma GitHub Actions-installation som tidigare. Pages ska fortsatt publiceras via **GitHub Actions** från den byggda `site/`-mappen. Byt inte till direktpublicering från `main`/roten: RAW-beroendet installeras och kopieras av bygget.

GitHub Actions ska köra `npm ci`, `npm test`, `npm run build` och publicera `site/`. Testfiler återskapas från `test-suite.json` även om gamla tester finns kvar i repot. Bygget kopierar alla nya skript till `site/`. Kontrollera efter publicering att sidfoten visar **1.1 Beta 1**. Om en gammal offlineversion ligger kvar: stäng appflikarna och öppna sidan igen efter lyckat bygge.

## Färgmotor från Beta 4

- **Separat färgkalibrering och tonanalys.** Vid bekräftad filmruta sparas bildens kanalrespons. Ändrad beskärning analyserar om ett gemensamt tonomfång utan att uppskatta tre nya färgkurvor. Knappen *Uppskatta färg på nytt* gör en uttrycklig ny uppskattning från aktuell ruta.
- **Två neutrala ytor.** Valfri mätning av en ljus och en mörk neutral yta ger relativ kanalrespons och färgankare. Ordningen spelar ingen roll. Välj verkligt neutrala ytor, utan klippning; inte hud eller gräs. Dåliga prov kan fortfarande ge dålig färg – appen kan inte veta om ytan verkligen är neutral.
- **Rullkalibrering.** Spara kurvorna och aktivera dem på andra bilder från samma film och avfotografering. Valet är per bild; en uppskattad kalibrering märks som uppskattad även när den delas. Gemensam filmbas och ljuskälla är fortfarande separata referenser. Kalibrering från annan kamera/importdomän används inte tyst.
- **Gemensam tonåtergivning.** Exponering och färgbalans appliceras före sRGB-kodning. Ljushetsjusteringar använder en gemensam skala. Den mjuka högdagern minskar hela RGB-tripeln med samma faktor och bevarar dess förhållanden före kreativa profiler. Ett rakt alternativ finns för jämförelse.
- **RAW med större marginal.** LibRaw avkodar till linjär Rec.2020. Därefter konverteras RGB till linjär sRGB med en fast, gemensam halvskala före lagring i 16 bitar. Detta bevarar sRGB-värden över 1 som tidigare klipptes under avkodningen. Det är ingen kanalvis maskkompensation. Preview och export använder samma normaliserade källdata.
- **Källkontroll.** RAW-importen kan växlas tillbaka till 3.9. Byte läser om aktuell RAW och tar bort dess inkompatibla källreferenser. Projekt från 3.9 behåller sin gamla RAW-import. Inbäddad JPEG är fortsatt uttryckligt reservläge.

Utan uppmätta referenser bygger den första färguppskattningen fortfarande på 3.9:s robusta kanalpercentiler. Den är inte en universell filmprofil. Bekräfta filmrutan först, särskilt om automatiken är osäker. När den bekräftas sparas färgkurvorna; senare tonanalys följer beskärningen.

Uppmätt filmbas används i densitetsförhållandet även med automatiskt tonomfång. Ljuskällans diagonala färgkorrektion tar ut sig om den appliceras lika på uppmätt filmbas och motiv. Saknas filmbas kan en ljuskällereferens användas, men den räcker inte ensam för att känna filmens färgrespons.

## Första testet

1. Importera en RAF och kontrollera filmrutan. Välj Neutral kreativ profil och återställ bildreglagen.
2. Prova Beta 4 med *större färgmarginal*. Titta på hud, neutrala ytor, skuggor och starka färger.
3. För jämförelse av bara färgmetoden: byt till Beta 3.9 utan att ändra RAW-import.
4. För jämförelse med hela 3.9-kedjan: välj *3.9 · linjär sRGB* under RAW-import, låt bilden laddas om och välj färgmetod 3.9.
5. Exportera TIFF med önskad rotation/beskärning. RAW-originalet ändras aldrig.

Tvåpunktskalibrering och rullreferenser är frivilliga. Direkt import till automatisk positiv och TIFF-export fungerar utan dem.

## Prestanda och begränsningar

Worker-preview, senaste-jobbet-kö, mindre förhandsvisning under reglagedrag och stegvis TIFF-export behålls. Kanalernas tekniska uppslagstabeller återanvänds när bara bildreglagen ändras. Beta 4:s gemensamma RGB-tonhantering kan inte ersättas av tre oberoende fullständiga kanaltabeller; den kräver mer beräkning än 3.9:s enklaste läge. Ingen generell hastighetsförbättring utlovas.

Tidigare bearbetade TIFF/JPEG kan ha egna kurvor och klippta kanaler. De kan inte automatiskt bli identiska med RAW. Negativa sRGB-komponenter efter arbetsrymdskonvertering begränsas till noll inför densitetsberäkning. Sensor- eller tidigare RAW-klippning kan inte återskapas. Den fasta RAW-halvskalan kostar cirka ett bitsteg i den interna 16-bitarskvantiseringen och ger större färgmarginal.

Projekt innehåller inställningar och kalibrering, inte originalbilder. Safari/iPad och bred kamerakompatibilitet återstår att verifiera på fysiska enheter. Se `TEST_REPORT.md` för genomförda tester och jämförelsens gränser.
