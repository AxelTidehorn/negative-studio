# Standardmotorn: experiment med låg signaltillit

Utgår från `main` **6e1861f** (inklusive #20 och mergade #21). Endast
`calibrated4`-färgbilder ändras. Detta är ett praktiskt experiment; de rapporterade
RAF-prickarnas orsak och en förbättring på originalbilderna är **inte verifierade**.
De två RAF-filerna är inte tillgängliga lokalt eftersom bilageöverföringen nekade
filer över 32 MiB. Inga nya testfiler krävs från användaren för detta experiment.

## Aktiv kedja och hypotes

`beta38.js` ersätter den äldre pixelvägen med `NSPixelKernel`; `beta4.js` väljer
`calibrated4` och dess sparade respons. CPU/preview-worker och samtliga exportvägar
använder `render-core.js`. Aktiv WebGL-preview använder motsvarande GLSL i
`gpu-renderer.js`. Den äldre jämförelsemotorn heter **log39**, inte `reference`.

- Båda motorerna läser samma RAW-data. Skyddad RAW-import kan redan ha klippt
  negativa matristransformerade kanaler till noll; detta är tidigare belagt med
  syntetiska indata, inte med de rapporterade RAF-filerna.
- `log39` normaliserar logaritmisk densitet separat per kanal och klipper varje
  kanal till [0,1]. Det tar bort variation utanför intervallet, även högdagerdetalj.
- `calibrated4` behåller signerade kalibreringskoordinater, använder ett gemensamt
  tonintervall och mjuk RGB-proportionell skuldra. Responsens kanallutningar och
  `-log10(max(1/65535,v))` kan göra små källvariationer stora när v närmar sig noll.
  Temperatur, mättnad och kreativa profiler kan därefter förstärka synligheten.
- Hypotes: osäker lågtransmissionskrominans blir synlig som starka färgprickar.
  Syntetiska tester reproducerar mekanismen, men skiljer inte verkligt filmkorn,
  demosaikbrus och ursprungliga motivfärger åt. Ett bevisat numeriskt haveri har
  inte hittats. Avkodning/normalisering och GPU-precision ändras inte på gissning.

#21 finns i main men är villkorad av `toneMode4 === 'experimental'`. Reglagets
befintliga `beta4.js`-handler sparar alla val utom `reference` som `smooth`.
Experimentet kan alltså vara inaktivt efter ett UI-val. Även påtvingat i kärnan
var det ingen allmän bruslösning: det väljer på utgående peak, inte källsignal,
och kan förvandla kromavariation till ljushetsvariation. Dess UI/handler lämnas
oförändrade i detta avgränsade uppdrag; den nya kandidaten fungerar i `smooth`.

## Kandidater och valt ingrepp

Tre interna kandidater jämförs i `test/standard-engine-experiment.mjs`:

| Metod | RGB RMS | Ljushetsvariation | Kroma vid klippt blå källkanal |
|---|---:|---:|---:|
| Ursprunglig standardmotor | 0,03683 | 0,10654 | 0,42798 |
| Påtvingad #21 | 0,07022 | 0,19978 | 0,05001 |
| Mjuk log-golvning, hypot(v,8/65535) | 0,01186 | 0,02501 | 0,28507 |
| Vald: selektiv krominansbegränsning | 0,01248 | 0,02215 | 0,07917 |

Testet varierar blå källa 0–16/65535, med R=0,002 och G=0,001, och låser
responsen till offset=0, span=4. Enheterna är linjärt visningsljus. RMS mäts mot
mittprovet 8/65535; kroma=max(RGB)−min(RGB). Resultaten är testfallsberoende,
inte en skattning av förbättringen för en kamera. Mjuk golvning ändrar också
neutrala toner; den valda kandidaten lämnar dem och den befintliga logaritmen kvar.

Efter oförändrad respons och gemensamt tonintervall, före exponering/vitbalans:

1. Beräkna låg signaltillit från den minsta ursprungliga transmissionen:
   `t = clamp(log2(64 / (65535 * max(1/65535, min(v)))) / 4, 0, 1)`.
   I implementationen uttrycks detta algebraiskt i kalibrerade koordinater.
   Sex gränsvärden förberäknas; inga nya logaritmer per pixel behövs.
2. `fade = 0.85 * t² * (3−2t)`; blanda varje positiv komponent mot den gemensamma
   viktade neutralen med denna faktor (sRGB- eller Rec.2020-vikter).
3. Fortsätt med oförändrad exponering, balans, tonkurva, skuldra och profil.

Alla källkanaler >=64/65535 lämnas oförändrade. Under 4/65535 behålls 15 % av
krominansen. Gemensam viktad kalibreringsintensitet och kromans riktning bevaras
**i detta steg**, före senare vitbalans/gamut/skuldra; slutlig visningsljushet kan
ändras eftersom minskad peak ger mindre skulderkompression. Neutraler bevaras.
Inga grannpixlar läses: gemensam tonvariation/detalj/ljushetskorn suddas inte ut.

Trösklarna är en experimentell fast heuristik i normaliserad transmission,
**inte uppmätt sensorbrus**. Mycket täta, äkta mättade färger kan tappa färgstyrka;
återgivningen av gamla calibrated4-projekt kan därför förändras på denna gren.
Kandidaten återställer inte förlorade/klippta källvärden, och hjälper inte säkert
artefakter vars källa ligger över tröskeln. Ingen projektversion eller UI ändras.

## Verifiering och kostnad

- Resultat: **34/34 Node-grupper, 9/9 browsergrupper, produktionsbygge och
  byggtester passerar**. Baseline: 33/33 Node-grupper före ändringen. Inga gamla pixelreferenser eller
  toleranser uppdateras. Nya oberoende skalära orakel testar avsiktliga skillnader.
- Tester omfattar neutrala och färgade gradienter, ojämna responskurvor, ändrad
  filmbas/ljuskälla, låg transmission, gränser/klippning, mättade färger över knät,
  bevarad högdagerseparation samt oförändrad kalibrering och jämförelsemotor.
- Lågtransmissionsdata går genom heltals-LUT, float, flat-field, presentation,
  16-bitars TIFF och JPEG-worker/main-thread. 36 riktade WebGL-fall (sRGB/Rec.2020,
  neutral/färg/svartvitt, tre tonlägen, med/utan reglageändringar) matchar CPU
  exakt efter 8-bitarskvantisering i Chromium/SwiftShader. Browserfall testar
  verkliga workers, JPEG-kodning och återanvändning av källtextur.
- CPU-kostnad: median av sju växelvisa körningar efter två uppvärmningar,
  100 000 förberedda 16-bitars pixlar per körning, gammal/ny kärna i samma Node-
  process. Mätningar i en delad utvecklingsmiljö varierar; den optimerade snabba
  grenen undviker kromaberäkningen när ingen kanal behöver den. Slutmätning: hög signal 215,71 → 218,13 ms (+1,1 %); låg signal
  245,46 → 304,20 ms (+23,9 %). Detta är CPU-kostnad, inte fysisk GPU-mätning.
- Extra direktjämförelse mot main: 144 000 kanalvärden matchar exakt för
  färg över signaltröskeln och svartvitt över hela signalintervallet, med olika
  tonlägen, arbetsfärgrymder och reglageändringar.
- Stripebudget, käll-LUT, GPU-källtextur och fem-bildersgräns behålls. Inga extra
  bildbuffertar eller rumsliga filter tillkommer. Fysisk iPad Safari/Edge och
  verklig GPU-prestanda återstår att testa; SwiftShader är ingen sådan mätning.

För manuell bedömning: jämför samma projekt/filmruta/reglage med main och grenen,
standard `smooth`, vid 100 %, i både preview och export. Bedöm särskilt cyan/vatten,
täta mättade färger, neutrala högdagrar och bevarat korn. Merga först efter visuell
bedömning; experimentet påstår inte att RAF-problemet är löst.
