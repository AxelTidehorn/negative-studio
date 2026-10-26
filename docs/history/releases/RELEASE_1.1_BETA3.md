# FILMLABB 1.1 Beta 3

## Förändringar
- Alla nio färgprofiler och fyra kreativa svartvita profiler har tydligare, separata tonkurvor och färgprioriteringar. De är fortfarande kreativa filminspirerade tolkningar, inte verifierade emulsioner.
- Ny profilversion 2 används för nya bildköer. Gamla projekt utan profilversion använder exakt de gamla profilerna. Byte av profil i väljaren väljer den nya tolkningen. Neutral är fortsatt neutral.
- Ny standardanalys tar begränsade prov direkt från originalets källdata. Den tekniska pixelkonverteringen och RAW-transformeringen är oförändrade. Tidigare projekt behåller previewbaserad analys för att inte ändra utseende automatiskt.
- Motorväljaren visar normalt **Standard · kalibrerad färg** och **Jämförelse · tidigare automatisk färg**. Gamla motorer läggs till i väljaren endast när ett sådant projekt är öppet. Historiska kanallutningar visas bara för det läge som använder dem.
- Den kompakta arbetsytans CSS, paneler, zoom, histogram och layoutfunktioner är kvar. Inga korn-, halation- eller skärpeeffekter har lagts till.

## Installera
Ladda upp ZIP-innehållet i befintlig GitHub-root. Bevara `.github/workflows`. Kommandona är oförändrade: `npm ci`, `npm test`, `npm run build`. Publicera `site/` som tidigare. Käll-ZIP:en innehåller inte node_modules eller en förkompilerad site. Tidigare workflowfil saknades i underlaget och har inte ersatts.

## Filmkanter
En verklig, avgränsad orsak är åtgärdad: tillagd ytterkant kan ändra vilka motivpixlar en nedskalad preview representerar. Vid samma fysiska analysruta använder den nya vägen originalproven och är oberoende av previewns storlek.

Detta löser inte automatiskt felaktigt vald filmruta, opålitlig filmbas eller klippta källkanaler. Behåll filmkanten i slutbilden genom att lämna **Beskär exporten till filmrutan** avmarkerad. **Hela bilden** ändrar analysområdet och kan därmed ändra färgen; knappen har fått en förklarande tooltip.

## Prova
Importera dina negativ i en ny kö, välj Neutral och kontrollera filmrutan. Jämför sedan profilerna vid samma styrka, gärna 70 %. Prova också 100 % för att bedöma deras tydligare egenkaraktär. Svartvitt vid 0 % ger neutral svartvit återgivning, och ökad styrka blandar in den valda ton- och färgblandningen.

Vill du behålla en gammal redigering: öppna dess projekt efter bildimport. Dess profil, analys och motor bevaras. Nyvalda kreativa profiler används som ett uttryckligt utseendebyte.
