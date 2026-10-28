# Separat automatisk FILMLABB 2.0-publicering

Status 2026-10-28: **publicerad över HTTPS**.

**[Öppna FILMLABB 2.0](https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html)**

Första deploymenten verifierades i [Actions-körning 40662298385](https://github.com/AxelTidehorn/negative-studio-v2-preview/actions/runs/40662298385),
med source-commit `d79169f77f0304762dbc0f5f579533b031f88a29`. Workflowet är
installerat på preview-repositoryts `main`, och ägaren har aktiverat Pages med
GitHub Actions. Ingen ytterligare engångsåtgärd behövs.

Vid första försöket nekade anslutningen repositoryskapande och Pages-aktivering
med HTTP 403. Ägaren skapade repositoryt, gav åtkomst och aktiverade Pages i
webbgränssnittet. Därefter installerades workflowet och publiceringen lyckades.
Ingen Pages-konfiguration eller deployment i produktionsrepositoryt ändrades.
PR #36 ska inte mergas för att uppdatera denna testmiljö.

## Vald lösning

Ett separat publikt GitHub-repository, `AxelTidehorn/negative-studio-v2-preview`,
äger sin egen GitHub Pages-deployment. Det är ingen extra branch-deployment i
`negative-studio`: GitHub Pages erbjuder inte automatiskt separata branchadresser.
Befintliga `.github/workflows/pages.yml` och `build.yml` ändras inte.

Workflow `.github/workflows/v2-preview.yml` lagras i PR #36 som en installerbar
workflow. **Den måste finnas på main i preview-repositoryt för att köras där.**
Dess uttryckliga repository-villkor förhindrar att den publicerar från vanliga
`negative-studio`, även om filen senare skulle finnas på main där.

Workflow i preview-repositoryt:

1. Körs vid installation/ändring av workflowfilen på preview-main, manuellt eller
   enligt schema var femte minut. GitHub kan fördröja schemalagda körningar;
   detta är polling efter nya commits, inte en omedelbar push-hook.
2. Checkar alltid ut **`AxelTidehorn/negative-studio`, branch
   `feat/filmlabb-v2-prototype`**, aldrig produktions-main eller ett PR-mergecommit.
3. Jämför den utcheckade committen med publik `preview-deployment.json`.
   Oförändrad källa hoppas över vid schemakörning. Manuell körning forcerar build.
4. Kör `npm ci`, `npm run build` och numeriska v2-tester. Förbereder därefter
   endast byggda `site/` för preview. Alla JS/WASM-workers behålls.
5. Laddar upp hela `site/` med GitHubs vanliga Pages-actions och publicerar med
   preview-repositoryts egna `GITHUB_TOKEN`/OIDC-rättigheter.
6. Kontrollerar verklig HTTPS-deployment: source-commit, `v2.html`, samtliga
   scriptreferenser, LibRaw-modul/worker/implementation och WASM-signatur/MIME.
   Fel gör körningen röd. Metadatafilen innehåller exakt publicerad source-commit.

Inga nya externa tjänster, betalda abonnemang, PAT-token, repository secrets,
deploy keys eller korsvis skrivrätt till produktion behövs. GitHub Actions/Pages
måste vara aktiverat i det publika preview-repositoryt. Publika schemalagda
workflows kan inaktiveras av GitHub efter lång inaktivitet; återaktivera i Actions
om GitHub visar ett sådant meddelande.

## Engångsinstallation (nu utförd; referens för eventuell återställning)

Följande installation är genomförd. Ägaren skapade repositoryt och aktiverade
Pages; workflowet installerades via Git. Stegen behöver inte göras igen:

1. Skapa ett **publikt** repository med exakt namn
   **`AxelTidehorn/negative-studio-v2-preview`**, initialisera med README och
   behåll `main` som default branch.
2. Under **Settings → Pages → Build and deployment → Source** välj
   **GitHub Actions**. Om Actions är avstängt, aktivera det under Settings → Actions.
3. Lägg till filen **`.github/workflows/v2-preview.yml`** på preview-repositoryts
   `main`. Kopiera exakt innehåll från samma fil i PR #36. Det är en engångs-
   installation av workflow, inte manuell uppladdning av webbplatsens buildfiler.
4. Öppna **Actions → Publish isolated FILMLABB v2 preview**. Installationspushen
   ska starta körningen; annars välj **Run workflow** på main.
5. Kontrollera att även sista steget **Verify the deployed commit and resources
   over HTTPS** blir grönt. Därefter finns den faktiska adressen i körningens
   `github-pages`-miljö och under Settings → Pages. Öppna dess `v2.html`.

Efter denna installation hämtas nya commits på utvecklingsgrenen automatiskt.
Användaren ska aldrig behöva bygga, ladda ner ZIP, köra lokal server eller ladda
upp `site/`. Workflowfilen i preview-repositoryt behöver bara ändras om själva
publicerings-workflowet ändras; kod/bygg-/verifieringsverktyg hämtas från grenen.

Om GitHub-anslutningen ges tillräckliga administrations-/workflow-rättigheter
kan installationen också färdigställas via API. Vanlig repository-läsåtkomst
räcker inte, vilket 403-resultaten visade i denna session.

**Publicerad och verifierad adress:**
[https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html](https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html).

## Service worker, cache och sökvägar

GitHub Pages-projekten har samma origin `axeltidehorn.github.io`, men olika
sökvägar. Produktionsworkerns scope `/negative-studio/` omfattar inte previewns
`/negative-studio-v2-preview/`. Däremot är CacheStorage gemensam för hela origin.
Den nuvarande produktionsworkern raderar alla `filmlabb-*`-cacher vid aktivering;
att bara ändra previewns scope hade därför inte räckt.

`tools/prepare-v2-preview.mjs` stänger av offline-registrering och cache-worker
**enbart i preview-artefakten**. Preview registrerar ingen service worker,
intercepterar inte navigationer och läser/skriver/raderar ingen CacheStorage.
Produktionskällor, produktionsbuild och ordinarie offlinefunktion ändras inte.
Preview förutsätter nätåtkomst och använder vanlig HTTP-cache. GitHub Pages och
webbläsaren kan cachea resurser en tid; ladda om sidan efter en ny publicering,
vid behov med omladdning utan cache på datorn. En redan öppen flik uppdaterar inte
sitt körande JavaScript mitt under ett bildtest.

Relativa scriptreferenser (`./v2-core.js` etc), dynamisk import
`./libraw/dist/index.js`, worker-URL relativ till modulen och WASM relativ till
LibRaw ligger kvar under samma preview-sökväg. Ingen root-absolut sökväg till
produktionsrepositoryt införs. `.nojekyll` följer med som statisk markör.

## Verifiering och begränsningar

- `npm ci` och `npm run build`: befintlig build, inga nya beroenden.
- `node tests/v2-preview.mjs`: kopierar build till temporär preview, verifierar
  att produktionsworker och bildbehandlings-/RAW-resurser är byte-identiska;
  testar två projektsökvägar på samma origin i Chromium. En produktionsworker
  och en sentinel-cache finns redan. Besök i preview-index och `v2.html`
  lämnar produktionsregistrering/cache orörda. Syntetisk DNG avkodas med verklig
  LibRaw/WASM-worker, A/B körs och riktig v2-TIFF laddas ned. Inga 404 eller
  JavaScript-fel tillåts.
- `node tools/verify-v2-preview.mjs`: körs efter riktig deployment och avvisar
  fel adress, fel commit, saknade resurser eller fel JS/WASM-MIME. En lokal
  browserkörning är inte en verifiering av en publik HTTPS-deployment.
- Verklig produktions-HTML hämtades före arbetet för hashjämförelse efteråt.
- Fysisk iPad Safari och Windows Edge är inte verifierade i denna miljö.
- Konverteringsmatematik, UI och projekthantering ändras inte i uppdraget.


## Verifiering av faktisk publicering

Första Actions-körningen slutfördes med samtliga steg gröna: npm ci, build,
v2-tester, cacheisolering, Pages-deployment och efterföljande HTTPS-kontroll.
Samma HTTPS-verifierare kördes även från utvecklingsmiljön via dess nätproxy:
korrekt source-commit, 20 script, JS-MIME och giltig WASM på 1 417 725 byte.

Produktionssidans HTML-hash är fortfarande
`8173902c10ab820654e9c5d67eba9d106f9e215b3a128b49eb186de2db32c88a`,
identisk före och efter publiceringen. Preview har egen Pages-konfiguration och
egen deploymenthistorik. Nuvarande publicerade commit kan läsas i
[preview-deployment.json](https://axeltidehorn.github.io/negative-studio-v2-preview/preview-deployment.json).

Det funktionella RAW→v2→TIFF-flödet är browserverifierat lokalt med samma
publiceringsartefakt och projektsökväg. Försöket att köra Chromium direkt mot
den publika adressen stoppades av utvecklingsmiljöns proxycertifikat
(`ERR_CERT_AUTHORITY_INVALID`); TLS-verifiering stängdes inte av. Publik HTTPS
och resurser verifierades separat med giltig CA-trust. Fysisk iPad Safari och
Windows Edge återstår som enhetstest.
