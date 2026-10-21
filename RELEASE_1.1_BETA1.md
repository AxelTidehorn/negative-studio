# FILMLABB 1.1 Beta 1 — arbetsyta

Utgår från användarens Beta 4. Bildmotor och RAW-kod har inte ändrats.

- Bildkö i vänsterspalt på breda skärmar; horisontell kö under bilden på mindre skärmar.
- Visning av bildkö och justeringspanel styrs var för sig.
- Fokusläge döljer båda panelerna; återställningsknapp finns.
- Dra skiljelinjerna på breda skärmar för att ändra panelbredd, eller använd piltangenterna på en fokuserad avdelare.
- Layoutriktningar sparas i webbläsarens localStorage.
- Responsiv layout med brytpunkter vid 1100 och 760 px.

## Bygg och publicera
Rotpaket: ladda upp alla uppackade filer direkt i GitHub-projektets rot och behåll befintliga undermappar. GitHub Actions kör `npm ci`, `npm test` och `npm run build` och publicerar `site/`. Ingen manuell uppladdning av `site/` eller `tests/` behövs.
LibRaw-filer följer inte med den uppladdade Beta 4 och måste hämtas via paketberoendet.

## Teststatus
Kontrollerat från en rotinstallation med libraw-wasm 1.6.0: `npm test` och `npm run build` passerar, inklusive riktig WASM-avkodning av DNG. Alla lokala skriptreferenser, offlinefiler och byggkopior kontrollerades, inklusive `workspace.js`. UI- och färgmotorkod är identiska med det uppladdade paketet. Manuell layoutkontroll i iPad-/Windows-webbläsare återstår.
