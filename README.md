# Negative Studio v0.7 — iPad offline

## Installation och uppdatering
1. Behåll ditt GitHub-repository och dess GitHub Pages-inställning **Source: GitHub Actions**. På gratis GitHub-konto måste Pages-projektet normalt vara publikt.
2. Ersätt i repositoryts rot: `index.html`, `build.mjs`, `package.json`, `sw.js`, `manifest.webmanifest`, `README.md`.
3. Behåll `.github/workflows/` där den ligger, eller använd de fullständiga medföljande filerna.
4. När **Publish Negative Studio** är grön, öppna `https://axeltidehorn.github.io/negative-studio/`. Ladda om online en gång för att få ny offline-cache.
5. Installera via Safari > Dela > Lägg till på hemskärmen. Kontrollera offline i flygplansläge efter en onlineöppning.
6. Inga RAF-filer skickas till GitHub; allt bearbetas lokalt. Uppdatering kräver internet men användning ska fungera offline när samtliga WASM-filer cachelagrats.

## Nytt
* Fem bilder i arbetskö. Filmremsa under Negativ/Positiv/Jämför. Fast bildyta med scrollbara reglage på större skärmar.
* Inbäddad RAF-JPEG för snabb bläddring, och full 16-bitars LibRaw vid separat begäran och TIFF-export.
* Emulsionsprofil är separat från användarens reglage. Generisk, UltraMax 400, Gold 200, Portra 400. **Numeriska transformvärden är uttryckligen experimentella hypoteser**, inte kalibrerade mätdata.
* En central analysyta exkluderar fem procent kring bildkanterna, som en första skyddsåtgärd (inte faktisk automatisk bildrutadetektion).

## Viktiga begränsningar
* En profil från publicerade karakteristiska densitets- och spektralkurvor kräver även ljuskällans spektrum, sensorns känslighet och en referenspositiv för verklig färgkalibrering. Kodak E-4050 och E-7022 anges som referens; vi har **inte digitiserat kurvor numeriskt** i v0.7. UltraMax saknar motsvarande verifierad komplett kurvuppsättning här.
* Filmbas utan exponeringsfri kant är en uppskattning. Varje JPEG-förhandsvisning kan skilja sig från slutlig 16-bitars RAW-export.
* RAF-filer blir temporärt inlästa i minnet vid JPEG-extraktion och full RAW-avkodning. Batch-TIFF max tre åt gången.
* Arbetskö/projektfiler lagrar inte original-RAF.
* UI- och WASM-användning behöver verifieras på iPad.

Källor: https://www.kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/e4050_portra_400.pdf och https://www.kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7022_Gold_200.pdf
