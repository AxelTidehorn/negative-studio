# Negative Studio v0.6 – experimentell

## Uppdateringar utan ZIP/a-Shell (GitHub Pages)

1. OBS: GitHub Pages på gratis GitHub-konto kan kräva ett **public** repository. Projektets källkod blir då offentlig, men bilder behandlas endast lokalt i webbläsaren och laddas inte upp. Publicera aldrig privata RAF-filer i repot.
2. Repository → Settings → Pages → Source: **GitHub Actions**. Om Pages inte erbjuds med privat repo, välj själv om du vill göra koden publik; annars fortsätt via artefakt + a-Shell.
3. Ladda upp/ersätt projektfilerna från detta paket, **inklusive** `.github/workflows/pages.yml`. `build.yml` är fortsatt den vanliga reservvägen.
4. Vid varje push publiceras appen automatiskt till `https://<användarnamn>.github.io/negative-studio/` (om Pages är tillgängligt och deploy går igenom). Öppna URL:en en gång online, lägg på hemskärmen via Safari. Offline-serviceworkern försöker cachea HTML, JS och WASM. Verifiera OFFLINE genom att stänga av nätverk och öppna igen innan du förlitar dig på lösningen.
5. RAW-filer väljs **från Filer**, aldrig från GitHub. Inga serveranrop görs för filmrullar.
6. Om den nya versionen inte syns, öppna sidan med nätverk och ladda om för att uppdatera cache. Installation/uppdatering kräver internet; användning efter cache ska fungera offline.

## Använda appen

* Importera flera RAF/JPEG/TIFF på en gång. Bläddra i filmremsan. RAF avkodas **en bild i taget** för att minska minnet.
* Välj generisk eller experimentell emissionsprofil. Dessa är ENDAST startvärden för tre parametrar – **inte vetenskapligt kalibrerade filmprofiler**.
* Tryck **Kopiera inställningar till hela rullen** för gemensamma justeringar; per-bild exponering bevaras. Bildspecifika reglage sparas inom sessionen.
* **Avancerad konvertering** fälls ut vid behov. Saknas säker filmkant, välj motivbaserad konvertering. Algoritmen är fortfarande heuristisk.
* JPEG-ZIP exporterar bilder sekventiellt i 8 bitar. TIFF-knappen exporter högst tre markerade i taget; iPad Safari kan begränsa flera nedladdningar. Exporten kan vara långsam och minneskrävande.
* Spara rullprojekt JSON regelbundet. Filen lagrar justeringar men inte originalbilder. Vid återöppning: importera **samma** bildfiler först, importera sedan rullprojekt JSON.

## Begränsningar

* Ingen validerad per-emulsionsprofil eller exponeringskalibrering. Ingen professionell färghantering/ICC eller kontrollerad testnegativreferens.
* Batch-JPEG avkodas på nytt per bild och kan ta tid; 16-bitars TIFF-batch hämtar flera filer separat och kan bli blockerad av Safari.
* 16-bitars TIFF-källor/RAF har högbitarsdata, men delar av analysen sker på 8-bitars nedskalad förhandsvisning. Inget påstående om end-to-end filmkorrekt färg.
* Offline-cachen kan rensas av iPadOS; spara alltid programkoden och projekt-JSON separat.
* GitHub Pages är en enklare distribution, men är en extern **distributionsserver** vid uppdatering; själva bilderna behandlas lokalt.
