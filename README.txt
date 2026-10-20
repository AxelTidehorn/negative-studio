Negative Studio v0.5 – experimentell, lokal negativkonverterare

NYTT: Motivbaserat läge när filmkanten saknas; automatiska kanalnivåer (1.5–98.5 percentiler), svart-/vitpunkt, gamma, justerbar autofärgbalans, bevarad högbitars TIFF-export samt RAF-avkodning via LibRaw WebAssembly.

INSTALLATION: Ladda upp samtliga filer inklusive .github/workflows/build.yml på GitHub. Actions bygger site/ som artifact. Packa upp hela artifact-mappen. Kör en lokal HTTP-server i projektmappen i a-Shell: python3 -m http.server 8000 --bind 127.0.0.1. Öppna http://127.0.0.1:8000 i Safari. HTML från Genvägar/data: kan inte importera lokala moduler.

TEST: Börja med färgnegativet från X-T3. Utan synlig oexponerad kant, aktivera 'Ingen pålitlig filmbas'. Testa automatisk nivå och justera autofärgbalans. Om det finns filmkant: avaktivera läget och använd pipett. Exportera TIFF.

VIKTIGT: Resultatet är inte filmkalibrerat, auto-nivåer kan överneutralisera avsiktlig färg; reglagen kommer efter bildframkallningen. 16-bitars TIFF från RAF men pipeline bygger på LibRaw RGB (kameraavkodning inkluderar vald vitbalans). Automatisk nivåanalys utgår från 8-bitars förhandsvisning och appliceras även på 16-bitars export. RAW avkodas en fil åt gången och batch finns ännu inte. JPEG-exponering max 3500 px. Appen kräver tillgänglig localhost-server; kan användas offline. Ingen molnlagring.
