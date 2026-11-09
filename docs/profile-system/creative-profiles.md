# Kreativa fotografiska profiler, revision 1

Bas: main `cbadf23`, inklusive mergade #90/#91. #91:s CI 42578648351
kontrollerades som godkänd. Åtta aktiva färgprofiler, Neutral och Neutral
svartvit använder en gemensam presentationsoperator före Editing 2.0.
Inga Pro Image-/legacyprofiler eller print styles aktiveras.

## Design och datakällor

`creative-profile-designs.json` är redigeringskällan för de fyra egna
profilerna. Generatorn skriver explicita värden i den frysta körkatalogen.
Work-JSON fortsätter att vara källa till de fyra filmprofilerna, vars hela
definitioner är hash-låsta mot mergad #91. Inga filmvärden ändras.

Detta är egna designhypoteser, inte forskningsvärden eller kopior av Classic
Neg. Varje profil har stabilt ID, kategori `creative`, revision, beskrivning,
tonkurva, sju nyansregioner, ljushetsberoende kromatik, toning och hudpass.
Namn och beskrivning deltar inte i bildmatematiken. Styrka blandas en gång i
kodad sRGB; 0 % returnerar ingången exakt.

| Profil / ID | Fotografisk identitet | Färg- och tonrelation |
| --- | --- | --- |
| Backstreet / `creative.backstreet` | Documentary Color | Tätare lågton, fastare mellanregister; olivgrönt, mindre gulgrönt/blått/cyan och bibehållen röd närvaro. Ingen fast skuggfärgning. |
| Afterglow / `creative.afterglow` | Night Color | Lägre blå ljushet, något högre blå kromatik, mild kall toning av redan färgade skuggor. Varm orange/röd kromatik får marginal och högdagrar komprimeras försiktigt. |
| Pale Static / `creative.pale-static` | Editorial Matte | Lyft svartpunkt, ljusare lägre mellantoner, komprimerat vitt och mindre blå/grön kromatik. Ingen färgning av neutralaxeln. |
| Redline / `creative.redline` | Copper Contrast | Rött mot koppar, gult mot ockra utan Golds gula kromavinst; tät lågton och fastare mellanregister mot mörkare, svalare blått. Lågt hudpass. |

## Begränsningen som behövde öppnas

Den gamla valideraren avvisar en matt tonkurva med ändpunkter 0,10/0,965 i
perceptuellt L (`PROFILE_DATA_INVALID`), trots att befintlig CPU-PCHIP och
GPU-koefficienter redan stöder den. Kravet på exakt 0/1 tas bort generellt.
Ändliga värden inom [0,1], nio knutar och monoton ordning krävs fortfarande.
Pale Static ger då svart cirka 0,01292 och vitt cirka 0,9541 i kodad sRGB vid
100 %. Övriga kreativa profiler behåller svart 0 men har något lägre vitpunkt.

Ingen ny matematisk funktion, shader, pass, toningsmask eller negativmotor
behövs. Skyddet för nära neutrala färger och exakt grå gör att Afterglow inte
kan färga alla neutrala skuggor blå. Det är en avsiktlig begränsning. Hudskyddet
är en färgregion, inte ansiktsdetektering; färgade lampor utanför regionen
kan fortfarande påverka hud. Små mättade ljuskällor måste därför bedömas senare.

## Automatisk verifiering

Lokalt godkända riktade tester:

- Numerisk profilsvit: 736 patch/styrkefall (368 filmfall mot oberoende
  Work-facit, maxfel 9,44e-8; kreativa fall verifierar exakt styrkeblandning).
  Alla åtta genomgår 17³ gamutgrid, monotona gråramper och nyanskontinuitet.
  Matt svart/vitt, ogiltiga ändpunkter, minskande kurva och katalog-ID:n provas.
- Syntetiskt hudskydd vid 100 %: högsta |Δh| Backstreet 0,18°, Afterglow
  0,16°, Pale Static 0,86° och Redline 2,27°. Högsta |ΔC| är 0,00745.
  Dessa faktiska utfall är säkerhetsprover, inte fotografiskt godkännande.
- Browser: 40 CPU/GPU-fall vid 0/35/70/100 %, max Float32-fel 6,98e-6
  (gräns 2e-4); RGBA8 högst 1 kod. Samma slutshader, inget extra pass.
- Alla åtta filmer/egna profiler samt mono exporteras till JPEG8/PNG8/PNG16/
  TIFF16 vid fyra styrkor. De egna profilerna körs dessutom med Worker
  avstängd vid 70 %. Totalt 160 exportfall. PNG/TIFF-kontrolläsning matchar
  gemensam kernel exakt, inklusive RGB16-lågbitar och TIFF-ICC.
- Profilbyte ger noll RAW-decode-anrop, oförändrat källobjekt/källversion,
  analysantal, V2-recept och antal positiva rekonstruktioner. Histogrammets
  kanaler räknas från samma presenterade RGB-samples. Editing-reset behåller
  rollens look; tvåbildskö och projektens 35/70/100 %-val provas.
- Beskrivningarna och kategoriindelningen använder befintlig väljare och
  intensitet. Beskrivningar verifieras på svenska, engelska, franska,
  spanska och tyska. Tvåkolumnslayout och Amber Dark/Light är oförändrade.
- `npm run test:fast`: 6/6 grupper. Full befintlig CI körs på PR-revisionen;
  slutstatus och körningslänk redovisas i PR:n.

## Bildjämförelser och begränsningar

Reproduktion använder samma arkiv som #91, se [tidigare leverans](film-stage-2.md).
Efter uppackning av #90:s översikter och RGB16-detaljer utanför Git:

```sh
node tools/profile-film-proofs.mjs /private/archive/FILMLABB_3_PROFILE_REVIEW /private/creative-proofs
python tools/profile-film-contacts.py /private/creative-proofs
```

Verktyget ger Neutral och alla åtta profiler vid 35/70/100 %. Kontaktkartornas
höjd följer antalet val; etiketter visar stabilt ID och procent. A-kontroller
utelämnas här så att de tre huvudmotiven har samma D-bas som #91. Varje bild
har identisk teknisk konvertering, exponering, ton och neutral Editing inom
sin jämförelse. Käll-/utdatahash, dimensioner, maxkodade pixlar och tider
registreras i manifestet. Originalfoton och provbilder ligger utanför Git.

**Proverna återbehandlar kvantiserade Neutral-exporter:** RGB8-översikter och
fem RGB16-utsnitt. De är inte nya fullupplösta RAW-exporter. Fem detaljområden
behåller arkivets skala och koordinater; dessa finns i #90:s mätningar.

05 ger porträtt, fönstergrönska, varm interiör och blå klänning. Här syns
Backstreets dämpade blått mot Afterglows djupare och rikare blått. Pale Static
lättar bilden och dämpar klänningen. Redline håller ett fastare mellanregister
och rikare färg än Backstreet, men de två överlappar i motiv med lite rött.
09 ger snö, arkitektur, grå neutrala ytor och mörkt vatten: profilerna skiljer
sig främst tonalt, och ingen gör snön till en blå helbild. Detta motiv är
svagt som test av egen färgidentitet.

Det saknas dokumentär gata med tydlig färgrekvisita, natt/LED/neon, olika
hudtoner och representativ tegel/rost. Afterglow är därför inte fotografiskt
nattverifierad och Redlines kopparkaraktär behöver verkliga röda objekt i
nästa kalibrering. Inga syntetiska färgprover får räknas som sådana motiv.

| Överlappning | Bedömning och kommande prov |
| --- | --- |
| Backstreet mot Gold/Portra | Båda kan ge olivgrönt. Backstreet har tätare lågton och mindre blått; Portra öppnar lågton, Gold förstärker gult. Svagt röda motiv kan också överlappa Redline. |
| Afterglow mot Ektar | Båda kan ge starkare blått. Afterglow fördjupar blått mer, håller annan lågton och tillför en färgskyddad kall skuggvektor. Nattljus saknas i materialet. |
| Pale Static mot Portra/Pro 400H | Alla kan öppna lägre toner. Matte ändpunkter och tydligare blå/grön dämpning skiljer Pale Static; Pro 400H har svalare/livligare grön relation. Lågkontrastsnö är en överlappande motivtyp. |
| Redline mot Gold | Redline prioriterar röd kromatik/rotation och mörkare blå motvikt; Gold prioriterar gul kromavinst. Den skillnaden behöver riktiga röda/gula föremål, inte bara porträtt. |

## Prestanda och version

Profilval använder samma positivcache och kompilerade parametrar som tidigare.
Inga nya fullstora mellanbilder eller extra pass. Import och PNG16-optimering
är inte ändrade; inga fysiska prestandalöften eller före/efter-importmätningar
görs. Manifestets per-pixel-tider inkluderar provverktygets validering och
är inte en mätning av appens import/export. Befintlig first-parent-beta-policy
ger nytt synligt utvecklingsnummer och nästa mergeordinal utan paketbasbyte.

Slutlig estetisk kalibrering, särskilt nattljus och kopparröda föremål, återstår.
