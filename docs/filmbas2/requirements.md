# Filmbas 2 – kravspårning

Utgångspunkt: main a393d4f6627f30eedea12263d2ade62c745300b8, 2026-10-27.
Förstudien FILMLABB_Filmbas2_Forstudie.md saknas. De två implementationsbilagorna är identiska.
Status nedan avser nuläget före ändring; kodexistens räknas inte som UI-verifiering.

| Krav | Nuläge | Kod/funktion | Åtgärd och verifiering |
|---|---|---|---|
| A importdetektion, fyra kanter, bekräfta/lås/reset | FINNS | frame-controller, geometry-ui | Återanvänd; browserprov |
| A touch/Pencil/zoom precision | EJ VERIFIERAD | imagePoint, geometry-ui | Chromium touch + zoom; fysisk Pencil krävs |
| A stabil teknisk referens vid ROI | DELVIS | standard-controller response4 | Versionerat godkännande, invariansprov |
| B sammanhängande regiondetektion | SAKNAS | image-model findBase | Ny opt-in detektor med gemensam statistik |
| B clipping, låg signal, kontamination, avstå | DELVIS | findBase | Kanaldiagnostik, syntetiska prov |
| B alternativa masker och överensstämmelse | SAKNAS | findBase | Mjuk prior, konsensus, avstå vid tvetydighet |
| B prestanda/cache | DELVIS | conversionCache3 | Bunden sampling, källa/revisionscache |
| C 7×7 snabbval | FINNS | sampleBase | Behåll legacy, granskningssteg i v2 |
| C rektangel, flytta/resize | SAKNAS | frame-controller | Separat källkoordinatverktyg, browserprov |
| C negativlupp/live RGB/statistik | SAKNAS | sourcePixel | 8× källuppslag, robust statistik |
| C jämförelse/acceptera/ångra/auto/lås | SAKNAS | recalc skriver direkt | Förslag separerat från godkännande |
| D capture/measurement/proposal/accepted | SAKNAS | manualCalibration | V2 metadata utan bildbuffertar |
| D kompatibel delning/override | DELVIS | calibrationBase/domain4 | Fullt kontextkontrakt, varning, test |
| D projekt och export-snapshot | DELVIS | project-controller/configuration38 | Spara explicit referens och ljus; deep-copy snapshot |
| D fem motorers respons/ROI | DELVIS | standard/conversion3/comparison | Frys adapters vid godkännande; separera scen |
| D äldre projekt | FINNS | versionerade projekt | V2 enbart explicit aktivering; regressionstest |
| E rotation/komposition/rutnät | FINNS | geometry-ui/geometry | Verifiera, ingen ny layout |
| E gemensam exportcrop/arv/projekt | FINNS | geometry-state/project-controller | Befintliga projekt-/browserprov |
| E footer/två kolumner/teman/fokus/histogram | FINNS | index, compact-ui, appearance | Befintliga browserprov + skärmbilder |
| E sliders/reset/interaktivitet | FINNS | editing-controller/preview-scheduler | Befintliga tester, ingen ny beräkningsväg |
| F CPU/GPU/JPEG/TIFF/legacy | EJ VERIFIERAD | testsviter | Full svit + riktade v2-prov |
| F verklig färgriktighet/iPad Safari/Windows Edge | EJ VERIFIERAD | Inga referensbilder/enheter | Kräver verkliga referenser och fysisk testmiljö |
