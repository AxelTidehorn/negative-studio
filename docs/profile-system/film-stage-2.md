# Pro 400H och Portra 400: implementation och provning

Bas: aktuell main `e6115f5b518801b689b9f3f98a6c56b0572cf9f2`, mergad #90.
#90:s slutrevision `70bedf2` har verifierad CI-success, inklusive test:full,
i körning 42535789095; build success och deploy skipped. Denna etapp ändrar
bara katalogens explicita aktiveringslista och genererade profildata i appen.

## Definitioner och fotografiska beslut

Båda profilerna använder exakt Work-bibliotekets revision 1/startvärden och
`profile-oklch-display-1`. Ingen experimentell förstärkning har lagts till.
Atlasens relationer ger stöd för riktning; talen är föreslagna designvärden,
inte uppmätta emulsionsparametrar eller en bestämd labbskanning.

- `film.fuji-pro-400h`: grön ankarriktning +10°, lokal L +0,018; varma
  regioner dämpas försiktigt. Blå ankarriktning är 0°. Hudpass 0,28.
  Läs F14.02/F21.04 för blad mot moln och hud, F14.17 för rött,
  F18.03 för försiktig blåbehandling och F18.10 för skuggdjup.
- `film.kodak-portra-400`: öppnare lågtonskurva, begränsad orange/gul
  kromadämpning, grönt −2° och blått 0°. Hudpass 0,21. Ingen varm
  högdagertoning. Läs P09.03/F21.04 för hud, P09.10/P02.02 för lågton
  mot vitt, P17.03 för grönska och P13.01 för blå färg.

Tonkurva och selektiv färg samverkar. Fuji öppnar mer och skiljer grönt från
gulgrönt; Portra håller ihop tonen mer försiktigt och lämnar huden nära basen.
Work-startvärdena behålls för en första komplett katalog; slutlig estetisk
kalibrering sker efter resterande profilsystem. Alla filmer märks fortfarande
som prototyper i befintlig UI på fem språk. Namnen är katalogdata och kräver
inga nya översättningssträngar. Kreativa profiler aktiveras inte.

## Reproducerbara kontroller

`node tests/profile-system.mjs`: 368 oberoende Work-facitfall vid 0/35/70/100 %,
maximalt sRGB-fel `9,4357e-8`. Alla fyra filmer omfattas av 17³ gamutgrid,
monoton gråramp, nyanskontinuitet, exakt 0 %-identitet och datavalidering.
Gold/Ektar-definitionernas hash är låst mot mergad #90. Syntetiska hudprover
för båda nya filmerna vid 70 % klarar |Δh| ≤3° och |ΔC| ≤0,008; ljus nästan
neutral klarar |ΔC| ≤0,004 och |ΔL| ≤0,015. Detta är färgprover, inte test av
ansiktsdetektering eller bevis på fotografisk hudkalibrering.

Observerat vid 70 % på Work-prover:

| Prov | Pro 400H ΔL / Δh | Portra ΔL / Δh |
| --- | --- | --- |
| Lövgrönt | +0,0274 / +6,82° | +0,0060 / −1,36° |
| Löv i skugga | +0,0286 / +6,78° | +0,0084 / −1,35° |
| Ljus hud | +0,0100 / −0,39° | +0,0040 / nära 0° |
| Mörk hud | +0,0164 / −0,33° | +0,0084 / +0,01° |
| Blåtonad vit | +0,0010 / nära 0° | +0,0004 / nära 0° |

`node tests/profile-system-browser.mjs`: 24 CPU/GPU-fall, högsta Float32-fel
`6,975e-6`, RGBA8 0 kodfel. Båda nya valen finns i verklig UI, profilbyte
behåller V2-recept och antal positiva rekonstruktioner. Samtliga fyra filmer
samt mono exporteras via ordinarie UI till JPEG/PNG8/PNG16/TIFF16. Avkodade
PNG/TIFF matchar gemensam CPU-kernel exakt, RGB16 har riktiga lågbitar.

## Bildmaterial och reproduktion

Privata källpaket från #90: [översikter och mätningar](https://drive.google.com/file/d/1C7jG3QQ1OulsQnbhLM8kV2lz99Ia3bCt/view)
och [RGB16-utsnitt](https://drive.google.com/file/d/18v9CNnz1cMSqu8vWPeUTEyjR1VKO75tf/view).
Båda hämtades och ZIP-CRC verifierades. Fotografier ligger utanför Git.

Packa upp båda i samma externa katalog. Kör från repositoryt:

```sh
node tools/profile-film-proofs.mjs /private/previous/FILMLABB_3_PROFILE_REVIEW /private/film-proofs
python tools/profile-film-contacts.py /private/film-proofs
```

Verktyget återbehandlar arkivets låsta Neutral-positiv med **appens befintliga
profiloperator**, inte en ny färgpipeline. Neutral samt alla fyra filmer vid
35/70/100 % produceras med identisk ingång. PNG-kontrolläsning verifierar alla
kanaler, färgdjup och Neutral-identitet. Manifestet registrerar käll-/utdatahash,
katalog-/operatorhash, dimensioner, medelskillnad, ändpunkter och operatörtid.
Kontaktkartor är RGB8; detaljfiler bevarar RGB16 och originalutsnittets skala.
Separata A-kontroller har egna kartor; de blandas inte med D-basen i samma karta.

**Begränsning:** översikterna utgår från redan kvantiserad RGB8 och detaljerna
från RGB16. Detta är inte nya fullupplösta RAW-exporter; skillnad mot en profil
på okvantiserad positiv och fullbildens klippning kan inte bedömas här.
Arkivets tekniska exponering, ton och neutrala Editing är redan inbakade och
ändras inte mellan profiler. De dokumenterade originalkoordinaterna finns i
#90:s mätningar. Inga nya analysområden eller negativa rekonstruktioner görs.

Materialet omfattar 05 (porträtt i kök, blå klänning, fönstergrönska), 09
(snötrappa, byggnad, mörkt vatten) och 11 (porträtt, ljusblå skjorta, ljus vägg).
Det saknas tillräcklig täckning av olika hudtoner, sol/mulet på tydlig grönska,
blå himmel och separata röda/gula föremål. F-GREEN/F-WARM och P-SKIN i hela
Work-matrisens scenbredd är därför inte fotografiskt godkända. Ingen panel,
stocktrohet eller fysisk iPad/Edge-prestanda hävdas.

## Version och prestanda

Befintlig `first-parent-beta` ger ny synlig utvecklingsversion för committen
och nästa betaordinal vid merge. Paketbasen `3.0.0-beta.0` ska därför inte
ändras. Ingen räknar-, cache- eller publiceringspolicy ändras.

Inget nytt pass, källa-/bildanalys, fullstor mellanbild eller profilberoende
specialfall tillkommer. Samma kompilerade parametrar och positivcache används.
Proof-manifestets CPU-tider inkluderar provverktygets validering och är inte
mätningar av import/PNG16-export i appen. Dessa befintliga prestandaproblem
kvarstår och ingår inte i denna etapp.

## Observerat i bildproverna

11 låsta källbilder/utsnitt (sex översikter inklusive separata A-kontroller,
fem RGB16-detaljer) gav 143 PNG-prover och 11 kontaktkartor. Pro 400H:s
öppnare tonalitet syns vid 70–100 % på 05 och 11; vid 35 % är den diskret.
Portra ger en mindre öppning och överlappar fortfarande Neutral tydligt,
särskilt i 09:s snö. Det är ett accepterat subtilt startuttryck, inte ett
påstående om tydlig blindidentifiering. Ingen parameter har ändrats för att
maximera skillnaden. På 05 syns skillnaden mot Ektars starkare blå klänning;
Gold ligger varmare/gulare. Hudvariation och skäggstruktur finns kvar i
11-utsnittet; inget uppenbart nytillkommet grönt/cyanstick syns i de två
porträtten. Det ersätter inte prov på andra hudtoner och ljus.

Medelabsolut kodad RGB-skillnad mot samma Neutral vid 70 %, hela D-översikten:

| Motiv | Pro 400H | Portra 400 |
| --- | --- | --- |
| 05 | 0,01314 | 0,00586 |
| 09 | 0,00753 | 0,00307 |
| 11 | 0,00988 | 0,00402 |

Dessa tal beskriver utfallet, inte fotografisk kvalitet. Båda nya profilerna
ger **0 extra pixlar med någon kanal på maxkod** vid 70 % i samtliga fem
undersökta RGB16-utsnitt. Det är ingen garanti för hela bildens högdagrar.
#90:s kända Ektar-risk i hela 09 kvarstår och har inte retuscherats bort.

Privat leverans i samma Drive-mapp som #90 (storlek och förälder verifierade
med metadata efter uppladdning):

| Paket | SHA256 |
| --- | --- |
| [Kontaktkartor + manifest](https://drive.google.com/file/d/1u-KMM6OQycyrMwNyBZiFFp7n_fJY-VHO/view) | `2aa44193707a6859157dc56ddad45a33b586b8663a5c2f2cc77be9042b7b9728` |
| [RGB16 05](https://drive.google.com/file/d/1ellvDU7CZjdMxAU5ko0C50Bq88z021yG/view) | `26d41f16a5641eba1da3c13ec0f82ea4e6820887aa17dd38c6a43a4ffe9fe645` |
| [RGB16 09](https://drive.google.com/file/d/1oa6U-iHT5mrkK5q4Z76WsAFqZczNhODH/view) | `ebc5513d0a00c694123407d1d90961e10afd29f184a907ed5406d04a798e74cd` |
| [RGB16 11](https://drive.google.com/file/d/16bAt_8zJ4TTC2dU1FltWiupXVTH_XWvx/view) | `e3ce8083b5f683e0ab0f6af8f5372b2c656a9d8738ba1dc8fa1f05ed36abb108` |

Alla fyra ZIP har lokal CRC-kontroll. 05/09 har två RGB16-utsnitt vardera,
11 har ett; varje utsnitt innehåller Neutral och de fyra filmerna vid tre
styrkor. Kontaktpaketet innehåller samtliga 11 kartor och manifestets alla
143 hashade prover. Översikts-PNG kan återskapas med kommandot ovan.

Slutlig lokal `npm run test:full`: **130/130 grupper**, 0 fel, 885,89 s
(Node/Chromium på Linux). Efter de sista utökningarna av testassertions
kördes profilernas numeriska svit och browser-/projektsvit separat med godkänt
resultat. Fullsviten omfattar befintliga motorer, D, Editing 2.0, kö/projekt,
worker/CPU-fallback, GPU och export. Tiden är för hela testsviten, inte ett
jämförbart mått på import eller PNG16-export.
