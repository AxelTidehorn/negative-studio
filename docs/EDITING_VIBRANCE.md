> **Arkivrapport.** Beskriver den angivna historiska implementationen. Motorval, projektmigreringar, labb och kommandon kan ha tagits bort. Aktuell produkt: [README](../README.md), [arkitektur](ARCHITECTURE.md) och [konsolidering](consolidation/README.md).

> Historical implementation/measurement record. Reproduction commands referring to removed tools require the [pinned PR #99 checkout](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/EDITING_VIBRANCE.md). This does not retire the application functionality described here. Current test commands and coverage are in [TESTING](TESTING.md).

# Lyster / Vibrance i Editing 2.0

Utgångspunkt: main `6fcdff3`, inklusive #60. Ett nytt manuellt reglage direkt
efter mättnad i Färg, −100 till +100, neutralt 0. Samma sliderbindning,
värdevisning, språkstöd, dubbeltryck och återställning som tidigare.

## Matematik och integration

Efter befintlig ton- och temperatur/tintbehandling används samma OKLab-matriser
som mättnadsreglaget. Global mättnad appliceras först på `a,b`. Därefter:

```
C² = a² + b²
W(C) = C² / (C² + 0.03²) × [0.12² / (C² + 0.12²)]²
gain = 1 + (lyster / 100) × W(C) × H
(a,b) := gain × (a,b)       // L behålls
```

`W` är mjuk, kontinuerlig, går mot noll nära gråaxeln och avtar för stark kroma.
Maximum är mindre än 0,54: gain förblir positiv även vid −100, utan nyansflippar.
Mättnad 0 ger C=0 och kan inte återfärgas av Lyster.

För positiv Lyster är `H = smoothstep(0,0.04,min(R,G,B)) ×
smoothstep(0,0.04,1−max(R,G,B))`, i linjär RGB före OKLab-steget.
Det skyddar RGB-gamutens kanter och svaga färgavvikelser i extrema toner.
För negativ Lyster är H=1; minskad kroma behöver inte skyddas från att röra sig
inåt i gamut. Befintlig gamutkompression används efteråt. OKLab-L och nyans
bevaras före den; färger utanför gamut kan få mindre avvikelser i slutresultatet.
Ingen ny tonkurva, knäparameter, vitbalans, scenanalys eller V2-återgivning införs.

Hudliknande prover och porträtt har kontrollerats. Inget separat orange-/hudfilter
införs: samma kromaskydd gäller alla nyanser. Ett sådant filter skulle även
påverka exempelvis trä, varma fasader och rumsljus. Stark positiv Lyster kan
fortfarande göra hud och befintliga färgstick för färgstarka; detta är ett
manuellt reglage, inte en hudidentifierare eller färgstickskorrigering.

CPU och genererad GLSL delar matriser och receptkonstanter. Chroma-vikten
beräknas från C², utan extra kvadratrot. Mättnad och Lyster använder **en**
OKLab-rundtur, inga nya fullstora buffertar, texturer eller GPU-pass.
Lyster 0 behåller den historiska pixelberäkningen och neutral bypass exakt.
V2:s frysta automatiska recept och tekniska cache ändras inte av reglaget.

## Projekt och äldre redigering

`vibrance` sparas per bild. Saknat värde blir 0. Kopiera färg/alla inkluderar
värdet; kopiera ton lämnar det ifred. Editing 1 behåller sitt historiska
pixelresultat och visar reglaget inaktiverat. Kopiering till en Editing 1-bild
kan lagra värdet men tillämpar det inte och byter inte redigeringsversion.

När något sparat värde är skilt från 0 används filtaggen
`negative-studio-roll-edit2-vibrance1` och `vibranceVersion:1`.
Äldre appkod avvisar taggen, verifierat mot den tidigare projektläsaren.
Aktuell läsare validerar värde/schema innan mutation och återanvänder sedan
befintliga V2-/Conversion 3-/geometrivalidatorer. Inga gamla recept migreras
automatiskt. Projekt med enbart nollvärden behåller den tidigare filtaggen.
Appens versionering är separat: nästa main-merge får nästa synliga beta enligt
befintlig first-parent-rutin, med faktisk bygg-SHA i footern och ny cacheidentitet.

## Jämförelser

- [Syntetiska prover: 0, +30, +60, −30](vibrance/synthetic-comparison.svg).
- [Reglaget i iPad-format](vibrance/ipad-control.png), med repositoryts offentliga demo.
- [Tre verkliga motiv, kontaktkarta](https://drive.google.com/file/d/1XNm0yIr0v1nzxYEkW42DHsjQNH92olqq/view).
- [Individuella PNG-par, recept och hashvärden (privat ZIP)](https://drive.google.com/file/d/1w_wuc-o__xiK79EGX-EhVfnWltIM16SO/view).

Fotografierna ligger endast i befintlig privat Drive-mapp. Samma tidigare
renderade V2-positiv (RGB8, cirka 900 px), filmbas, kalibrering, exponering och
crop används i varje rad; alla andra manuella reglage är neutrala. Värde 0 är
byteidentiskt med indata. Detta är en visuell kontroll av efterredigering,
inte en ny RAW-avkodning eller fullupplöst/16-bitars fotografisk validering.
Fasad/grönt och textilfärger blir rikare, −30 lugnare. +60 förstärker också
porträttens redan varma hudtoner; ingen automatisk bildkvalitetsförbättring påstås.

Återskapa prover med `node tools/render-vibrance-samples.mjs`. Verktyget kan
även ta en redan renderad positiv P6/RGB8 PPM och en utdatakatalog.

## Tester och prestanda

`npm run test:full`: **113/113 testgrupper passerade lokalt**.
306 shaderfall, inklusive positiva/negativa ändlägen, samspel med mättnad,
monokromt, profiler och två arbetsrymder: maximal CPU/GPU-skillnad **1/255**,
P99 **0/255**. Samma befintliga tolerans (2/255) används.
Alla 120 frysta RGB8/RGB16-exportreferenser vid Lyster 0 är oförändrade.
JPEG worker/reservläge är byteidentiska i exporttestet; RGB16 TIFF matchar
förberedda pixlar exakt. V2-exportens TIFF-bitar, sRGB-ICC, pixelvärden och
JPEG-signatur/avkodade dimensioner har också kontrollerats med Lyster aktivt.
Tester omfattar dessutom grått, nästan neutralt, hud/himmel/grönt/starka färger,
kontinuitet, äldre projekt, okända scheman, sparning, kopiering, reset och touch.

[Mätrapport med samtliga repetitioner](vibrance/performance.json).
Chromium 155/SwiftShader på Linux, offentlig 900×600-demo (0,54 MP), fem varma
repetitioner efter en uppvärmning, samma exponering +0,3 och kontrast 1,1:

| Mättnad / Lyster | CPU-preview 480 px, median ms | JPEG, median ms | TIFF, median ms |
| --- | ---: | ---: | ---: |
| 1 / 0 | 41,7 | 119,3 | 71,5 |
| 1 / +60 | 49,4 | 142,4 | 88,8 |
| 1,4 / 0 | 46,7 | 173,7 | 128,0 |
| 1,4 / +60 | 51,6 | 162,5 | 134,4 |

CPU-preview kostar här cirka +18 % när OKLab aktiveras, +10 % när mättnad
redan använder samma rundtur. Exporttiderna har spridning; den lägre JPEG-tiden
i sista paret ska inte tolkas som en hastighetsvinst. GPU-submit/finish låg på
0,1–0,2 ms median, vilket inte är ett tillförlitligt mått på fysisk GPU-prestanda.
Varje GPU-scenario laddade källtexturen en gång; källa och analys var oförändrade.
Rapporten avser arbetsgrenens kandidat ovanpå angiven baskommit, inte main utan
Lyster; SHA-256 för uppmätt editing-engine finns med. `export.sourceIntact:false`
avser inget aktivt jobb; den separata buffertkontrollen `sourceUnchanged` är true.

Återskapa med `node tools/benchmark-editing.mjs . /tmp/vibrance.json 5 vibrance`.
Detta verifierar inte prestanda för fullstora RAF eller fysisk iPad Safari/Edge;
dessa miljöer har inte varit tillgängliga. Ingen ny extra bildbuffert har införts.
