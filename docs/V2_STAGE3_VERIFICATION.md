# Steg 3: Fotografisk 2 – verifiering och beslut

Bas: main `d17b8c9`, efter integrerad PR #51. **Behåll Fotografisk 2 som
valbart startläge, men rekommendera det ännu inte som generell V2-standard.**
Det fungerar bra på flera porträtt och dagsljusmotiv, men färgutfall och
tonplacering är inte tillräckligt konsekventa över materialet. Inga
renderingsparametrar ändras och ingen Fotografisk 3 införs.

Enda kodändringen rättar ett verifierat diagnostikfel. Bildpixlar, Neutral,
Fotografisk 1/2, teknisk rekonstruktion och sparade recept är oförändrade.

## Material och jämförelse

De fem referenserna 04/05/06/09/10 och deras kontaktkartor/utsnitt från #51
återanvänds. RAW-/demosaicing- och densitetsmatrisundersökningen upprepas inte.
Ytterligare **sex unika RAF** hämtades från den anslutna originalmappen och
verifierades mot arkivets SHA256: 00/01/02/03/08/11. Mappen innehåller tolv
RAF-poster men 06/07 är byteidentiska; totalt elva unika källor bildverifieras.

De sex användes inte för utveckling av Fotografisk 2. De förekommer dock i
äldre utvärderingsmaterial och är inte en oberoende film-/kameravalidering
eller ett kolorimetriskt facit. Filmtyper och ursprunglig filmexponering är
okända. Ingen kontrollerad natt- eller exponeringsserie har verifierats.

Nya jämförelser använder samma låsta linjära Rec.2020, uppmätta bas, frysta
respons, analyskoordinater och neutrala kreativa reglage för alla tre lägen.
Samtliga sex ommätta baser matchar arkivet exakt. Översikterna integrerar
konverterade källpixlar före nedskalning; nya nativeutsnitt är 512×512
källpixlar utan omskalning. Inga gamla referensvärden eller bilder ersätts.

Även åtta TIFF-filer på 398–449 MB hittades i en annan befintlig Drive-mapp.
Hämtningen av ett 419027542-byte exemplar stoppades med HTTP 413: anslutningens
gräns är 268435456 byte (256 MiB). En begränsad anonym reservhämtning gav
HTML, inte TIFF. Deras transfer, eventuell tidigare negativkorrigering och
motiv är därför **inte verifierade**. De behandlades inte som linjära negativ.
För fortsatt test behövs åtkomliga mindre filer/utsnitt och dokumenterad domän.

## Fotografiskt resultat

| Bild | Observation av Fotografisk 2 |
|---|---|
| 00 fasad | Mindre grön karaktär än Neutral/Foto 1; användbar grund och bibehållen färgvariation |
| 01 buss | Små skillnader mot Foto 1; gul motivfärg och mörka detaljer kvar |
| 02 bil/gata | Stark grön/cyan karaktär kvarstår; färgbalansen avstår även efter bekräftad ruta. Kräver mer referensdata, inte en generell värmejustering |
| 03 starkt dagsljus | Blåare vatten/mindre gul karaktär än Foto 1. Användbart, men ingen uppmätt neutralreferens verifierar ljusfärgen |
| 08 grafiskt motiv | Terminalreferensen saknar stöd. Historisk bandfallback ger **pixelidentiskt** resultat med Foto 1; ingen särskild Foto 2-vinst |
| 11 inomhusporträtt | Något mindre grön/kall karaktär; användbar grund, liten förändring mot Foto 1 |

I 02 har den arkiverade automatiska rutan confidence 0,65. Den ligger under
befintlig tillitsgräns och ger avsiktlig 0 EV-/identitetsfallback, inte ett nytt
renderingsfel. Ett separat prov bekräftar uttryckligen **samma koordinater**:
exponeringen blir 5,100 EV och synlig median Y går från 0,013 till 0,365.
Färgkaraktären kvarstår. Den ursprungliga automatiska varianten sparas separat;
inga frysta förutsättningar skrivs över. Detta visar behov av normal
filmrutekontroll, inte skäl att sänka säkerhetsgränsen.

På de tidigare fem kvarstår #51:s förbättringar, främst varmt rumsljus/hud i
05 och mindre cyan i 10. Ingen kvalificerad ny referens kan med detta material
bevisas representera verklig neutralitet. Statistikens stöd räcker inte för
att kalla en ljusfärg korrekt. 05:s blandljus visar dessutom en lokal avvägning.

## Tonplacering, snö och redigeringsbehov

09:s P60/P99 är 0,055363/0,081493 i teknisk positiv Rec.2020. Begärd exponering
är 3,852999 EV, applicerad 3,849102 EV. Högdagerskyddet minskar alltså bara
**0,003897 EV**. Den mörka snön orsakas främst av P60-placeringen mot 0,8 och
den fotografiska tonkurvan, inte av en stor exponeringsspärr eller visad
förlust av snöinformationen. Utan scenreferens vet motorn inte att en stor
ljus yta ska vara högnyckel snarare än ett medelljust motiv.

Likadana punktprov ur frysta källor jämfördes med hypotetisk +0,5/+1 EV före
ton, samt det riktiga Editing 2.0-reglaget efter konvertering. 09:s synliga
linjära sRGB-median är 0,345 i grundprovet, 0,468/0,592 med +0,5/+1 EV före
ton och 0,427/0,513 med manuell Editing 2.0 +0,5/+1 EV. Proverna visar att
ljusare återgivning är möjlig; de är inte en implementerad automatisk kandidat
och används inte för att jämföra korn eller upplösning.

Samma +0,5 EV-hypotes prövades på 04/05/06/10. Ljusare porträtt kan vara
tilltalande, men ljusa partier i 05/10 blir mer dominerande. Underlaget ger
ingen universellt motiverad EV-bias eller snöregel. En riktad manuell justering
är rimlig för 09; ingen motivklassning eller ny exponeringsprior införs.

Fotografisk 2 kan minska behovet av värme-/tintjustering i vissa motiv, men
tonkurvan är densamma som Foto 1: någon generell minskning av behovet att
justera exponering/kontrast är inte verifierad. Nya 00/01/11 motiverar inte
heller en gemensam extra temperatur-, magenta- eller mättnadsökning. Ingen
spårbar uppsättning användargodkända slutredigeringar hittades som kan ge ett
objektivt genomsnittligt reglagebehov. Arkiverade externa konverterarinställningar
är inget sådant facit. Neutral behålls för egen tonläggning; i 08 finns ingen
entydig Foto 2-fördel, och i 02 behövs mer färgreferens oavsett läge.

## Blå/lila fönsterpartier i 05

Ett tidigare sparat nativeutsnitt undersöktes i flyttal genom kedjan, utan ny
RAW-avkodning. I ett diagnostiskt urval av 70242 ljusa blå prov finns B>G redan
före positiv färgbalans i alla prov. Inga ogiltiga, loggolvs- eller klippta
ändpunktsvärden registreras i dessa avkodade RGB-prov. Detta bevisar inte
sensor-SNR eller frånvaro av klippning inne i dekodern.

Ett snävare lilaurval (linjär sRGB Y>0,4, R−G>0,015 och B−G>0,015) innehåller
118 prov i Foto 2. **Inget** har lila komponentordning före positiv balans;
alla har den före gamut. Samma kriterium ger 81 prov i Foto 1 och 0 med
identitetsbalans. Det är en liten lokal försämring/avvägning som inte ska döljas:
den valda varmare positivbalansen kan föra vissa blå nyanser mot lila.
Trösklarna är endast analysurval, inte en ny korrigeringsregel eller en
semantisk klassning av alla dessa prov som felaktiga.

Slutsatsen är delad: blå karaktär finns före renderingen, medan viss
blå-till-lila förskjutning tillkommer i positivbalansen. Ton/gamut/kvantisering
är inte ensam ursprungskälla. Att stänga av all balans tar bort just detta
lilaurval men tar också bort användbara korrigeringar på andra motiv.
Selektiv blådesaturering eller påtvingad neutralisering saknar verifierat
färgfacit. Ingen sådan ändring införs. Fortsatt arbete med adaptation behöver
kontrollerade neutrala och färgade referenser över ljusförhållanden.

## Verifierat kodfel och korrigering

`diagnostics.js` använde fotografisk tonmedian endast för
`luminance-photographic-1`. Foto 2 rapporterades med neutral Reinhard, trots
att dess faktiska renderade bild använde den fotografiska kurvan.
Korrigeringen använder den befintliga `photographicVersion()`-funktionen.
Diagnostikens metodversion höjs **7 → 8**, utan ändrat rapportschema eller
konverterings-/projektversion. Inga pixelberäkningar ändras.

| Prov | Felrapporterad median efter ton | Korrekt median |
|---|---:|---:|
| Riktad syntetisk regression | 0,274129377 | 0,222864833 |
| 05, tidigare fryst analys | 0,280440497 | 0,229430608 |
| 09, tidigare fryst analys | 0,384961092 | 0,357470189 |

Siffrorna avser rapportens maskbaserade Rec.2020-tonmedian, inte den separat
uppmätta synliga sRGB-medianen. Gamla rapporter behålls; jämförelser måste ta
hänsyn till metodversion. Detta är korrigerad redovisning, ingen mörkare bild.

Utökade befintliga regressionstester kontrollerar neutral/Foto 1/Foto 2,
tonmedian och EV samt faktiskt worker- och huvudplattformdiagnostik. Den
befintliga fullsviten täcker även JPEG/RGB16, preview/export, historiska
projekt, Editing 2.0, basbyte/omanalys, cache och motorbyte.
`npm run test:full`: **106/106 grupper**, Node 24.22.1/Chromium, 275,46 s.
Build och diffkontroll passerar. Fysisk iPad Safari/Windows Edge har inte testats.

## Leverans och nästa behov

Befintliga privata kontaktkartor återanvänds. Kompletteringen innehåller
endast nytt referensmaterial, relevanta nativeutsnitt och isolerade ton-/färgprov;
inga fotografier läggs i Git. Numerisk sammanfattning finns i
`docs/measurements/v2-stage3-verification.json`.

Privata bildresultat (befintliga behörigheter, ingen publik delning):

- [Befintlig kontaktkarta från #51](https://drive.google.com/file/d/1sx1sSbaB8J2Sz7sEf7JxcK0x64DvSVQS/view).
- [Kompletterande kontaktkarta: sex RAF, Neutral/Foto 1/Foto 2](https://drive.google.com/file/d/1eJ3jyBwr76TQiDuu6kH2IxZqqITVqeUL/view).
- [Komplettering med nativeutsnitt, tonprov, artefaktjämförelse och mätresultat](https://drive.google.com/file/d/1o_wp8Q6o3OOuG8Utfn-MktsIicE-b2Ja/view).

De nya filerna har lästs tillbaka från Drive: kontaktkartan är 1630710 byte,
paketet 41536944 byte, båda i befintlig utvärderingsmapp med `shared:false`.

Fotografisk 2 behålls oförändrad och valbar. En generell standardrekommendation
kräver bredare film-/capturematerial, kontrollerade blandljus-/färgreferenser,
lågnyckel-/nattmotiv och spårbara önskade slutredigeringar. TIFF-källdomän och
åtkomst måste också verifieras innan de filerna kan räknas in. Nästa
utvecklingssteg med motorval, JPEG-prestanda, arkitektur eller GPU påbörjas inte.
