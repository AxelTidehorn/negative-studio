# Applikationsversion och aktiv konvertering

Versionspolicyn finns centralt i `package.json`: bas `2.0.0-beta.0`, strategi
`first-parent-beta`, ankare `a2fa2d801cbd905bd720777b058aef29bc620403` (main efter
PR #39). `tools/release-version.mjs` räknar mainlinjens första föräldrar efter
ankaret och genererar `2.0.0-beta.N` vid rena main-byggen. Första squash-/merge-
committet ger beta.1. Varje efterföljande merge får ett större, unikt nummer.
Direktcommits räknas också. Rebase-merge kan hoppa flera nummer, men varje
publicerat main-commit har fortfarande unikt nummer. Ingen release-PR, tagg,
separat räknare, skrivbehörighet eller dependency behövs. Flytta inte bas/ankare
inom samma betaserie.

Actions hämtar full historik (`fetch-depth: 0`). Pages bygger uttryckligen
aktuell `main`, även vid omkörning av äldre workflow. Samma commit ger samma
version. Deployments serialiseras; om HEAD hunnit bli inaktuell hoppas
publiceringen över. En omkörning förbrukar inget nummer och publicerar inte
avsiktligt en historisk event-SHA över nyare main. Anländer ny main precis
under deployment följer dess vanliga deployment efter. Saknad versionshistorik
stoppar ett main-bygge i stället för att gissa.

Utvecklingsbyggen får exempelvis `2.0.0-beta.1.dev.g64dcb7456363`.
Lokala ändringar lägger till `.dirty`; innehållsfingeravtrycket skiljer olika
arbetskopior med samma HEAD. Utan Git-historik märks utvecklingsbygget okänt/dev.
Klocktid och workflow-run räknas inte in i releaseversionen.

## Vilken kod kör jag?

Den befintliga **sidfootern** visar appversion, kort commit-SHA och gren.
Innehållsfingeravtryck och lokala ändringar ingår också i bygginformationen.
`build-info.json` är dess maskinläsbara kopia. Identiteten är inbakad i byggd
JavaScript, inte hämtad från en potentiellt nyare serverrapport när gammal kod
finns kvar offline. Buildmanifest och service-worker-cache får det nya byggets
innehållsidentitet. Ny kod blir aktiv efter service-worker-aktivering/omladdning.

`v2.html` visar samma byggidentitet och jämför med V2-workerns egen identitet;
olika byggen ger varning. Versionsinformationen byter inte publiceringsgren.

**Appversion och algoritmversion är skilda saker.** V2 sparar
`FILMLABB.V2Recipe` v1, `algorithmVersion: 1`, befintlig CalibrationV2 v2 och
RenderIntentV1. En ny appversion skriver inte om dessa versioner, äldre
responskurvor eller projektscheman. Motorvalet är fortsatt bildspecifikt.

Huvudplattformens befintliga kalibreringsstatus visar V2, experimentell, CPU,
uppmätt/antagen bas och aktiv/fallback/avstådd analys. Diagnostiken under
Avancerat innehåller faktiskt recept och statistik efter kreativ redigering.
Labbet har även automatic/technical/fixed. ”Aktiv” betyder att steget används,
inte att bildens färger är fotografiskt godkända.

## Verifiering och publicering

`tests/release-version.mjs` skapar en verklig Git-historik med två PR-merges
och flera feature-commits: unika betaordinaler, identiska omkörningar, dev-ID
och avvisad saknad main-historik. Build-/cachetester kontrollerar reproducerbart
innehåll och invalidation. `tests/build-version-browser.mjs` kontrollerar
footer, labb och workeridentitet.

Integrationen levereras som PR och mergas inte automatiskt. Ny versionspolicy
och V2-val blir **inte aktiva på ordinarie HTTPS-adress förrän ändringen mergats
och Pages-deploymenten lyckats**. Kontrollera då footern/`build-info.json` mot
mergad SHA. Den separata äldre previewmiljön följer fortsatt sin befintliga gren.
