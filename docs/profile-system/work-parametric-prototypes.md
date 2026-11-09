# Gold P och Portra P i applikationen

Bas: aktuell main `f33aea70ceba5b70ff030377ad5aaf16f440dd77` (#93), kontrollerad
mot origin före ändring. Inga andra pågående lokala ändringar har skrivits över.

Gold P ersätter aktiv `film.kodak-gold-200`; Portra P ersätter aktiv
`film.kodak-portra-400`. Båda har revision **2**, samma namn och ID som tidigare.
De väljs direkt i den befintliga profilväljaren. Sparade projekt och köer med
respektive ID använder nu revision 2; äldre estetiska revisioner hålls inte kvar
som produktalternativ. Projektformat och sparade styrkor är oförändrade.

## Faktiskt implementerade Work-värden

Källa: användarens `FILMLABB_Codex_Profiler_Litet_Paket.zip`,
`prototype/render.py`: `P=dict(GOLD,...)` respektive `R=dict(PORTRA,...)`.
`prototype/catalog.json` ger de övriga, oförändrade parametrarna. Båda har redan
exakt samma datakontrakt som den gemensamma operatorn; ingen skalning eller
försvagning av transformationerna behövs.

|Parameter|Gold P|Portra P|
|---|---|---|
|OKLab L, utvärden|0, .008, .027, .072, .139, .312, .629, .879, .994|0, .012, .046, .114, .196, .379, .618, .843, .995|
|Relativ kromatik mot L|0, −.08, −.017, .025, .012, −.08, −.15|0, −.025, −.045, −.03, −.04, −.075, −.13|

Tonkurvans invärden är 0, .01, .04, .10, .18, .35, .60, .85, 1.
Kromatikens L-invärden är 0, .18, .38, .60, .80, .92, 1.
Hue-rader, skugg-/högdagervektorer och hudgenomsläpp är exakt Work-basens
befintliga Gold-/Portra-värden. Hela den aktiva definitionen finns en gång i
`film-profile-designs.json`, som genererar `src/editing/profile-catalog.js`.
Originalbiblioteket under `work/` behålls som historiskt forskningsunderlag,
men genererar inte längre aktiva filmparametrar. Ektar och Pro 400H har flyttats
till den explicita källfilen utan en enda definitionsändring. De fyra kreativa
profilerna kommer fortsatt från sin oförändrade designfil.

Golds lägre mellanregister blir tätare: L=.35 går till .312 (tidigare .349).
Övre mellanregistret öppnas samtidigt: L=.60 går till .629 (tidigare .617).
Portra har en öppnare struktur, med L=.35 → .379 och mildare färg över stora
delar av skalan. Högdagertaken .994/.995 är avsiktliga Work-värden; rent vitt
är därför inte längre utgående 1 vid full styrka. Svart förblir svart.

Neutral, V2/D, RAW, operatorns matematik, hud-/neutralskydd, gamut, GPU/CPU,
cache, redigering, geometri och export är oförändrade. Styrkan blandas fortfarande
en gång i kodad sRGB. Ingen ny rendering, LUT eller bildanalys tillkommer.

## Gold H skjuts upp

Work H adderar lågkromatisk varm a,b-vektor samt en L-/a-/b-beroende korsled,
även på gråaxeln. Dagens skyddsvikt och gråaxel kan inte uttrycka detta genom
enbart katalogparametrar. Paketets renderade H använder dessutom en tetraedrisk
RGB16F-residualkub mot tonbasen. Appen saknar residual-/3D-LUT-kontrakt,
assetladdning och delad CPU/GPU-sampling. En exakt H skulle därför kräva en
operatorutvidgning eller LUT-infrastruktur med egna integrationstester.
Det ingår inte i denna avgränsade leverans; P-profilerna fördröjs inte.

## Reproducerbar teknisk kontroll

`tests/fixtures/work-parametric-oracle.json` innehåller oberoende float64-resultat
från **det bifogade Python-programmet**, med SHA256 för renderer och baskatalog.
318 prover per profil: 5³ RGB-grid, 128 färger med seed 311, gråramp, exakta
PCHIP-knutar och bibliotekets hud-/färgprover. Återskapa med:

```sh
python tools/profile-work-oracle.py /sokvag/till/paket/prototype
node tests/profile-system.mjs
node tests/v2-approved-d.mjs
npm run test:full
```

Python behövs bara för att återskapa oraklet. Appen och CI behöver inga nya
beroenden. Testet jämför alla parametrar mot Work, revision 2 samt 0/35/70/100 %.
2 544 oracle-fall ger högsta kanalavvikelse **1,9207 × 10⁻¹⁴** i kodad sRGB.
Oförändrade definitioner och Neutral/mono-metadata är frysta i regressionstester.
Befintliga gamutgrid-, gråramp-, nyanskontinuitets- och hudskyddstest behålls.

Webbläsarsviten testar faktisk CPU/GPU-preview och histogram, profilbyte utan
RAW-avkodning/ny analys/positivrekonstruktion, projekt, kö, reset och samtliga
JPEG8/PNG8/PNG16/TIFF16-exporter vid 0/35/70/100 %. Förlustfria exporter jämförs
mot bildkärnan inklusive 16-bitars lågbitar och färgmetadata.

## Enkel fotografisk jämförelse

Det lilla Work-paketet utelämnar testfoton och tidigare bildexporter. Vi använder
därför de redan tillgängliga privata FILMLABB-positiven från #90. Reproduktion:

```sh
node tools/profile-film-proofs.mjs /privat/FILMLABB_3_PROFILE_REVIEW /privat/work-p-proofs --work-p
python tools/profile-film-contacts.py /privat/work-p-proofs
```

Fyra kolumner vid 70 %: Neutral, tidigare Gold revision 1, Gold P, Portra P.
Tidigare Gold laddas endast i verktygets isolerade testkontext från frysta
`22b6418`; det aktiverar ingen extra profil i appen. Manifestet innehåller
källhashar, katalog-/operatorhash, styrka, dimensioner, färgdjup och endpointtal.
Översikterna är återbehandlade RGB8-positiv; detaljutsnitten är återbehandlade
RGB16-positiv i ursprunglig skala. De är **inte nya RAW-/nativeexporter**.
Alla förlustfria resultat avkodas och jämförs exakt med beräknad kvantisering.
Privata foton publiceras inte i Git eller PR:n.

## Begränsningar

Detta är Work-prototyper för praktisk användning, inte färdigkalibrerade
emulsionssimulationer. Den separata forsknings-/panelgrinden i paketets plan
är avsiktligt inte genomförd: uppdraget prioriterar aktiv implementation och
senare användning i FILMLABB. Ingen ny estetisk parameterexperimentserie görs.
Hudskyddet är fortsatt en färgregion, inte ansiktsdetektering. Gamutprojektion
kan fortfarande komprimera extrema färger. Reprocessade utsnitt kan inte avgöra
hela originalbildens klippning eller faktisk RAW-kvalitet.

Fysisk iPad Safari och Windows Edge kan inte verifieras i Linux-miljön.
Versionsnumret följer befintlig first-parent-beta-policy: commitidentifierat
utvecklingsbygge i PR:n, nytt synligt 3.0.0-beta.N när main senare mergas och
byggs. Ingen manuell räknare, merge eller deployment införs.

## Uppmätta resultat i denna ändring

Chromium/Linux: 40 faktiska CPU/GPU-fall, högsta slutliga floatkanalavvikelse
**7,57 × 10⁻⁶**, operatorjämförelse **7,59 × 10⁻⁶**; tolerans 2 × 10⁻⁴.
RGBA8 avviker högst **ett kodsteg**. Den utökade profilsviten verifierar
**168 exporter**, inklusive Gold P och Portra P i fallback utan Worker vid
70 %. Båda ingår också i projektkontroller vid 0/35/70/100 % och i histogram-/
resetkontrollen. Inga nya RAW-avkodningar eller positivrekonstruktioner vid
profilbyte. V2/D:s frysta tekniska test passerar oförändrat.

Bildprovet består av tre översikter och fem RGB16-detaljer, fyra behandlingar
vardera. Alla 32 PNG-resultat har exakt avkodad bildintegritet. Vid 70 % syns
Gold P:s tätare tonkropp i mörkt hår, blått tyg, sten och möbler; den skiljer
även lågkromatiska ytor från tidigare Gold. Portra P håller dessa mellanregister
öppnare och är mjukare i färgen. Snömotivet är fortsatt lågkontrast; profilerna
ersätter inte motivets ljus eller dess tekniska konvertering. Hudens befintliga
varmton finns kvar, ingen ny övergripande färgstickskorrigering har gjorts.
Detta är en begränsad visuell observation, inte ett slutligt estetiskt godkännande.

Genomsnittlig absolut kanaländring mot Neutral i de tre RGB8-översikterna:

|Profil 70 %|05|09|11|
|---|---:|---:|---:|
|Tidigare Gold|.00968|.00875|.01150|
|Gold P|.02285|.02576|.02854|
|Portra P|.01095|.00615|.00635|

Siffrorna dokumenterar utfallet, inte en optimering för stor numerisk skillnad.
Ingen av de nya profilernas RGB16-detaljer får pixlar vid maximal kod 65535;
Neutral-utsnitten har inte heller sådana. Översikternas maximala koder minskar
med de avsiktliga högdagertaken. Det återskapar inte redan bortklippt struktur.
Monoton gråramp och 16-bitars lågbitar verifieras; en full fotografisk
bandnings-/klippningsinventering på nya RAW-motiv återstår till praktisk användning.

**Dokumenterad skuggrisk:** vid omkvantisering av RGB8-översikterna får Gold P70
2 695 / 491 / 8 ytterligare pixlar med minst en kanal vid kod 0 i 05/09/11
(tidigare Gold70: 96 / 42 / 1). Dessa räknas över hela översikten inklusive
filmkant, utan ny ROI. Portra P70 ger inga nya nollkoder. Blandningen vid 70 %
behåller positiva floatkanaler för positiva indata; nollorna uppkommer vid
RGB8-kvantiseringen av de tätare skuggorna. Alla fem RGB16-utsnitten har **noll**
nya min-/maxkodspixlar för båda profilerna. Det utesluter inte mörk detaljförlust
på andra motiv eller vid 100 %; Golds täthet lämnas ändå exakt enligt Work.

Fullständig GitHub CI körs på PR:n. I denna Linuxmiljö fallerar det befintliga
`ui-motion-d2-browser.mjs` på statusradens geometri även på **oförändrad main
f33aea7**; samma påstående vid rad 60. Det separata vanliga animationstestet
passerar isolerat i alla tio viewport-/reduced-motion-fall. Inga UI-regler eller
animationstester ändras för att dölja miljöskillnaden. Slutlig CI-status redovisas
i PR:n, separat från dessa lokala resultat.
