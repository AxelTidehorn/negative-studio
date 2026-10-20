# Negative Studio v0.9.1 – färg och svartvitt

Bygger på v0.8.1 och behåller gränssnittet, offline-PWA, LibRaw, TIFF-export och fem-bilderskön.

## Nytt
- **Filmväljaren är synlig och användbar** (tidigare gömd av misstag i `sr-only`).
- Generisk C-41, UltraMax 400, Gold 200, Portra 160/400/800, Ektar 100, Pro Image 100, Fujifilm 400 och Pro 400H.
- **Svartvitt utan filmemulsionsprofiler**: optisk densitetsinvertering, neutral luminans och exponerings-/kontrastreglage; färgjustering av positivet ignoreras.
- Neutral, mjuk och klassisk **positiv återgivning** är frikopplad från filmval och från redigeringsreglagen.
- Export av inställningsprojekt tar med både filmval och återgivning.

## Viktigt om vetenskap och noggrannhet
Profilerna är **illustrativa, konservativa modeller**, inte extraherade mätprofiler eller en verifierad rekonstruktion av filmens färger. Tillverkarnas spektrala känslighets- och densitetskurvor räcker inte ensamma för att generera en kalibrerad Fuji-X-Pro3+ljuskälla+film-RGB-transform. De ger vägledning om modellens struktur, men exakta numeriska värden kräver mätning och referensnegativ. Kodaks publicerade Portra 400 E-4050, Gold 200 E-7022, RawTherapees Film Negative och darktables Negadoctor är relevanta tekniska referenser.

För färgnegativ kan färgmask, ojämn exponeringsnivå och en ljuskälla utan känd spektral fördelning ge stora färgfel. Använd helst en exponeringsfri filmkant och en separat ljuskällereferens. Välj neutral profil som kontroll och jämför sedan varianterna.

## Uppdatering på GitHub Pages
Ersätt `index.html`, `sw.js` och `README.md` i projektets rot. Låt fungerande `build.yml`, `pages.yml`, `package.json` och `build.mjs` vara kvar. GitHub Actions bygger och publicerar; gå till sidan online, uppdatera och kontrollera att v0.9 visas. Därefter kan appen fungera offline från cache. Lägg inte RAW-filer i GitHub-repositoryt.

## Tester som återstår på iPad
Kontrollera att filmvalet syns och förändrar färg/ton utan att reglagen rör sig. Byt till svartvitt och kontrollera gråskala, exponering, negativ/positiv samt TIFF och JPEG. Kontrollera batch/JPEG-ZIP och TIFF med en RAF. Syntaxkontroll är inte fullständig iPad-validering.


## v0.9.1
- Tydligare filmskillnader mellan profilerna.
- Större förhandsvisning.
- Dagläge/nattläge.
- Liten UI-uppfräschning med kontrastfärg.
