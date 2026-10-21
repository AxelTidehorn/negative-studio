# FILMLABB Beta 3.8 – enkel uppdatering

Det här paketet innehåller bara filer som ska ligga direkt i GitHub-projektets rot. Bildbehandlingen är densamma som i Beta 3.8.

1. Packa upp ZIP-filen.
2. Öppna projektroten på GitHub, där `index.html` och `package.json` ligger.
3. Välj Add file → Upload files och ladda upp ALLA uppackade filer samtidigt. Ersätt befintliga filer och committa till main.
4. Behåll befintliga `.github/workflows` och GitHub Pages-inställningen GitHub Actions.
5. Vänta på grön publicering i Actions och ladda sedan om appen. Den visar fortfarande Beta 3.8.

Du behöver inte skapa eller uppdatera mappar manuellt. `npm test` skapar den matchande tests-mappen från `test-suite.json` och kör de riktiga testerna. `npm run build` skapar site/ och kopierar LibRaw från npm-installationen. Befintliga workflow-steg med `node tests/raw-fixture.mjs` fungerar efter npm test.

Gamla tests-filer som paketet känner till ersätts under testkörningen; inga andra filer raderas. Äldre site-filer som finns i projektet ersätts av bygget där det behövs.

ZIP-filen ska packas upp före uppladdning. Ladda upp filerna till roten, inte ZIP-filen eller en omslutande mapp.

Paketet ändrar uppdateringsflödet, inte färgmetoden. TIFF-färgsticket och den experimentella densitetsmotorn har samma begränsningar som dokumenterats för 3.8. Se TEST_REPORT.md.
