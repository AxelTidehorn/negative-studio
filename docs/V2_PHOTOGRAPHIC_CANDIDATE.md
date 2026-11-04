# Fotografisk återgivningskandidat

Bas: main 51f9394, efter PR #43/#44. Teknisk inversion, filmbas, RAW,
färgbalans och gamutmappning från algoritm 3 är oförändrade. Filmtypen för de
fem 120-negativen är okänd; ingen emulationsprofil eller artificiellt korn införs.

Reinhard T(x)=x/(1+x) har relativ kontrast 1/(1+x). Vid P60-ankaret x=0,8
återstår cirka 56 procent av källans relativa luminanskontrast. Kandidaten
prövar en begränsad återställning före samma tonkurva:

`x' = x * 2^(0.5 * tanh(log2(x/0.8)))`, därefter `T(x')`.

P60-ankaret bevaras. Förändringen är högst ±0,5 EV; inga nya hårda svart-/vit-
punkter införs. Alla kanaler får samma luminansbaserade faktor. Det finns
varken en mättnadsgain eller ett antagande om en viss filmemulsion. Kontrasten
ökas främst runt ankaret, utan den djupa skuggkrossning som en global gamma
skulle ge. Högdagerfärgen behandlas fortsatt av algoritm 3.

Detta är en **opt-in-kandidat**, ingen ny standard. Algoritm 3:s neutrala läge
behålls. Fördelen är tydligast i porträttens tonseparation; färgkaraktären i
09/10 är fortfarande inte generellt lika användbar som den äldre återgivningen.
Underlaget motiverar inte att ersätta standarden eller hävda återställd,
emulsionsriktig filmkaraktär. Varma/kalla ljus korrigeras inte ytterligare;
begränsningarna i den befintliga neutralbalansen finns kvar.

Kandidaten har versionsmärkt tonrecept `photographic-log-contrast-1` med frysta
parametrar i RenderIntent. Äldre recept saknar detta fält och behåller exakt
sin gamla matematik. Äldre appar avvisar okänd tonmodell innan projektmutation.
Projekt med fotografiskt recept behåller det vid omanalys/basbyte. CPU-preview,
worker och export delar samma luminansfaktor.

Ingen ny UI-layout eller reglage införs. Kandidaten är tills vidare tillgänglig
via befintliga utvecklargränssnitt:

- Huvudplattform, efter val av V2 algoritm 3:
  `FILMLABB_V2.setRendering('photographic')` / `setRendering('neutral')`.
- Labb: `await NSV2Lab.setPhotographic(true)` / `setPhotographic(false)`.
- Privat bildtest: befintliga `tools/v2-response-validate.mjs` med
  `--photographic --export04` och samma paket-/original-/utdatakataloger.

Fem befintliga RAF har körts genom kandidaten med samma manuella bas och
utsnitt. Fyrkolumnskartan visar verklig **Original (log39)**, algoritm 2,
algoritm 3 och kandidaten. Den äldre sparade A-referensen visade Standard och
har därför inte felmärkts som Original. Original avkodas genom den riktiga
isolerade huvudapplikationen i skyddad linjär sRGB med egna automatiska
inställningar/profil; V2 använder låst linjär Rec.2020 och neutrala kreativa
inställningar. A-kolumnen är en fotografisk referens, inget färgfacit.
Alla bilder har använts historiskt; detta är ingen oberoende valideringsserie.

Riktade tester kontrollerar monotonitet, kontrastgräns, ankare, frysta färg- och
exponeringsparametrar, CPU-paritet samt projekt-/omanalys. Worker-växling mellan
neutral/fotografisk och faktisk TIFF-export är kontrollerad. Verklig 04-export
har RGB16, 3719×3678, sRGB-ICC 588 byte och 0 kodstegs fel i kontrollerade
referenspunkter. JPEG har också skapats; privatverktyget använder Canvas,
huvudplattformens JPEG/ICC-väg täcks separat av tidigare exporttester.

Ökad kontrast kan göra skuggor och korn tydligare/mörkare och ljusa färger mer
komprimerade. Vissa bilder förblir flacka och delvis cyan. Ingen generell
mättnadsökning införs för att dölja det. Fysisk iPad Safari/Edge är inte testad.
