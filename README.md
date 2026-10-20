# Negative Studio v0.8.1 – gränssnitt och återställd konvertering

Denna korrigeringsversion bygger på v0.8 men återställer densitetskonverteringens insignal från v0.7: den motivbaserade automatiska exponeringsmultiplikatorn används inte längre i pixelberäkningen. Välj alltid samma filmbasläge och reglage om du jämför med v0.7. Vald ljuskällereferens kan fortfarande påverka RGB-resultatet.

## Förändringar
- Större fast bildyta på iPad i landskapsläge: endast höger inställningskolumn scrollar.
- Import/JPEG/TIFF i kompakt verktygsrad.
- Filmprofil flyttad till höger, ovanför de enkla justeringarna.
- Positiv/Negativ/Jämför och zoom direkt under bilden, ovanför miniatyrerna.
- Referens, beskärningsverktyg och kopiera-inställningar flyttade till två stängda paneler i högerkolumnen.
- Arbetskö högst fem bilder samt RAW, TIFF, JPEG och befintliga profiler bevarade.
- TIFF- och JPEG-batch samt projektsparning kvar i högerkolumnen.

## Uppdatering
Ladda upp/ersätt `index.html`, `sw.js` och `README.md` i repositoryts rot. `build.mjs`, `package.json`, `manifest.webmanifest` och fungerande `.github/workflows/` kan behållas oförändrade. Kör GitHub Actions automatiskt, kontrollera både bygg- och publiceringsjobb, och uppdatera sidan i Safari. Verifiera `v0.8.1` i appens rubrik. Offlinetest efter att appens nya tillgångar cachats.

## Begränsningar
- Ingen ny filmvetenskap eller kalibrering i denna version.
- Automatisk beskärning är en heuristisk analysmarginal, inte exakt filmkantdetektion.
- RAF-avkodning och full TIFF-export behöver verifieras på iPad; webbläsarflödet har inte körts här.
- Välj bort gammal ljuskällereferens när du jämför konverteringen med v0.7.
