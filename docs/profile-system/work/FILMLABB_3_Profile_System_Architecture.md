# FILMLABB 3.0 · Profile System Architecture

8 november 2026. Granskad huvudgren: [6e3d763](https://github.com/AxelTidehorn/negative-studio/tree/6e3d763cfdaad958fac7baf4d8acda3cb5e9733b). [PR #89](https://github.com/AxelTidehorn/negative-studio/pull/89) är öppen. D är integrerad i produktionskoden på den öppna grenen vid [bb9829b](https://github.com/AxelTidehorn/negative-studio/blob/bb9829b8c58228370d7e70bde146654f5f0e4ed5/docs/V2_APPROVED_D_INTEGRATION.md). Main saknar fortfarande integrationen. Vid efcf88f laddades D via en patch i [granskningsmodellen](https://github.com/AxelTidehorn/negative-studio/blob/efcf88ffb1421fac507fb90351a713fee30ae9eb/tools/v2-presentation-model.mjs).

## 1. En aktiv färgkedja

Negativ → rekonstruktion → positivbalans och exponeringsintent → positiv ton → output-gamut och eventuell V2-finish → kodad sRGB → profil och en styrkeblandning → Editing 2.0 → sampling → JPEG, PNG8, PNG16, TIFF16.

Profilgränsen är kodad IEC sRGB, D65, tre ändliga flyttal i [0,1]. Neutral är exakt passthrough. V2 ansvarar för filmbas, rekonstruktion, balans, exponering, ton och eventuell finish. Looken läser enbart positiva RGB och profilens valda parametrar. Prova 35 % på samma stock och 70 % korsvis. Lås bas, redigering och sampling när effekten bedöms. Färgfel i Neutral felsöks uppströms.

Färska kompatibla V2-källor på main använder normalt Fotografisk 2 och photographic-finish-1. D använder B:s EV, matched-shoulder-1, kontrastparameter 0 och samma finish. A mot D varierar alltså flera tekniska faktorer. C mot D isolerar kontrasttermen vid gemensam EV och skuldra. Grenens nya tekniska ton-ID är luminance-matched-D-1 med fryst toneRecipe och scene-distribution-1. Återanvänd detta recept efter merge eller testa uttryckligen mot grenen. Fönster 05 är ett tekniskt kontrollmotiv. Prova samma look på frysta A/D-positiv. Håll en gemensam parameteruppsättning. Godkänn mot den faktiskt antagna V2-basen.

Bygg en liten körkatalog från JSON:s startvärden för godkända poster. En post har stabilt ID, namnnyckel, kategori och parametrar. Filmkaraktärer och Kreativa grupperar samma matematik. Neutral står överst. Hold-profilen Pro Image ligger i forskningsbiblioteket till dess att visuella grinden passerar. QA får välja Gold/Ektar redan i den första PR:en. JSON:s forskningsfält och facit används vid utveckling.

## 2. Inför, flytta och radera

| Ägare | Ändring |
|---|---|
| src/editing/creative-profiles.js, profile-settings.js | Radera i nuvarande form. Ny profile-engine.js och genererad katalog. Flytta syncEngineSelector till motor-/workflowägare, eftersom den styr motorval. Anslut profilinfo till UI-controller. |
| src/color/configuration.js, parameters.js | En snapshot med lookId, lookStrength, kompilerad look och separat monochrome. Ta bort c.profile, c.print, neutralProfile, neutralPrint, creativeVersion och gamla uppslagsvillkor. Välj snabbväg från effektiv bypass. |
| src/color/render-core.js | Radera emulsion, RGB-legacyoperatörer, tre printblock och v1/v2-dispatch. Koppla en gemensam positiv slutbehandling från V2, Standard och övriga aktiva positiva färgvägar. Se till att Editing 2.0 fortfarande körs exakt en gång. |
| src/render/gpu-renderer.js, gpu-preview.js | Ersätt gamla kreativa shaderfunktioner och tillhörande uProfile/uPrint/uTone/uChroma/uLow/uHigh/uMono/uBwCurve/uBwLift och kreativ uMatrix. Behåll tekniska konverteringsmatriser och manuella edit-uniformer. Vid fallback kör samma look i CPU. |
| Preview- och exportworkers, src/conversion-v2/worker.js och fast.js | Byt scriptimporter, mappa labbets Standard-probe till Neutral, ersätt de gamla profil/print-villkoren i compileLegacy. Dess tekniska referensfunktion fortsätter att verifieras. |
| src/export/export-controller.js, presentation-sampler.js, PNG- och TIFF-kodare | Samma kärna och matchad sampling för varje väg. Kvantisera sist. Prov av export med ICC, lågbitarsdata, avbrott, batch och fryst snapshot. |
| index.html, app/settings.js, queue-controller.js, project-controller.js, ui/workflow-ui.js, i18n-messages.js | En datadriven väljare, två kategorier och Neutral. En rollgemensam styrka, föreslaget 70 % när look väljs. Ta bort printStyle och gamla profiler, strängar, exportlåsreferenser och profilversionsfält. Validera projekt före kömutation. |
| Diagnostik, app-manifest.mjs, bygg, service worker och testharness | Uppdatera snapshot, UI- och worker-importer. Behåll neutral teknisk probe. Versionssätt offlinecachen enligt repo. Rensa verktyg och fixtures som endast jämför gammal estetik. |

Radera gamla Generic-definitionen, Roadtrip 400, Sundown 200, Sunday Best 400, Softspoken 160, Afterhours 800, Chroma 100, Daylight 100, Coolside 400, Pale Green 400, Soft Grain, Deep Silver, Fine Tone, Silver Light och Svartvitt neutral densitet som kreativt menyval. Ta bort Neutral kopia, Mjuk kopia och Klassisk kopia som separat lager. Kurvbehandling hör till looken eller till Editing 2.0.

**Svartvitt.** Föreslagen separat rullinställning monochrome. Beräkna neutral grå från det tekniska positiva RGB med linjär sRGB-luminans Y=dot(RGB,[0.2126,0.7152,0.0722]), koda gråvärdet och replikera det före Editing 2.0 i monoläge. I mono blir den aktiva looken Neutral. Prova på verkliga svartvita negativ, även källor med ojämn bas. Äldre BW-profiltyp styr i dag även delar av Standard och Editing. Frikoppla dem uttryckligen och granska svartvitt fotografiskt före sammanslagning.

**Projekt.** Ett yttre format filmlabb-roll-3 med look:{id,strength} och monochrome. Under det nya formatet återanvänds tekniska, geometriska och Editing 2.0-validerare. Radera creativeProfileVersion, gamla profil-ID:n, printfält och fallback. Avvisa gamla dokument tydligt och före tillståndsmutation. Ingen migrerings- eller dubbeldispatch. Tekniska V2-recept har separat identitet och livscykel.

## 3. Operatorns exakta beräkning

Använd JSON:s knutar, D65 och befintliga OKLab-matriser. L är perceptuell ljushet i OKLab, C=hypot(a,b), h i grader modulo 360 från rött mot gult, grönt, cyan och blått. PCHIP för L-kurvan. Periodisk hue-interpolation med första knuten +360 som sista punkt, t=(1−cos(πu))/2 inom varje intervall. Kromazonsinterpolation är linjär i L. Alla vikter utgår från ursprungligt positiv.

```text
if neutral or s == 0: return p
lin = decodeSRGB(p)
L,a,b = OKLab(lin)
if max(p)-min(p) <= 1e-7:
    q = encodeSRGB(PCHIP(cbrt(lin.r))^3) replicated to RGB
else:
    L = clamp(L,0,1)
    C = hypot(a,b)
    h = degrees(atan2(b,a)) mod 360
    ss(x,l,r) = smoothstep(l,r,x)
    band(x,[a,b,c,d]) = ss(x,a,b)*(1-ss(x,c,d))
    skin = band(h,[24,41,72,88])*band(C,[.018,.038,.115,.170])
           *band(L,[.20,.31,.85,.94])
    w = ss(C,.012,.042)*ss(L,.04,.16)*(1-ss(L,.86,.985))
        *(1-skin*(1-skin_colour_pass))
    room = ss(min(lin),0,.025)*ss(1-max(lin),0,.045)
    dC = HueCurve(delta_C_fraction,h)+LinearChromaCurve(L)
    C1 = C*max(0,1+w*(min(dC,0)+room*max(dC,0)))
    L1 = clamp(PCHIP(L)+w*HueCurve(delta_L,h),0,1)
    h1 = radians(h+w*HueCurve(delta_h_deg,h))
    tint = band(L,[.065,.20,.27,.52])*shadow_ab
           +band(L,[.52,.73,.85,.985])*highlight_ab
    lin1 = inverseOKLab([L1,C1*cos(h1)+w*tint.a,C1*sin(h1)+w*tint.b])
    q = encodeSRGB(gamutNeutralRay(lin1,knee=0))
return p+s*(q-p)
```

Återanvänd OKLab, PCHIP och neutralaxelprojektionen från editing-engine.js. Vid refaktorering ägs konstanter och koefficienter av en gemensam ren math-modul. Gamut är identitet i gamut. Utanför skalas RGB−Y mot gråaxeln med gemensam faktor, där Y är klampad linjär sRGB-luminans. Projektionen kan ändra slutlig OKLCh i hårt mättade färger. Ektars två himmelprov styr om ett ändrat gamutval behövs. Hudvikten skyddar en färgregion. Testa verklig hud och orange föremål samtidigt. Blanda i kodad sRGB en gång. Verifiera validering av ändliga tal, knutordning, monoton tonkurva och jämna h-gränser.

## 4. Cache, prestanda och regressioner

V2:s positivcache nycklas på källa och tekniskt RenderIntent, inklusive ton/output. Look-ID/styrka hör till slutrendering och export. Ett profilbyte får inte orsaka ny inversion. GPU och CPU ska få samma kompilerade värden. Histogram, huvudpreview och worker följer samma look. Kontrollera RGBA8 separat från RGB16. Lås sampling vid jämförelse, även fri rotation. Validera JPG före komprimering och TIFF16/PNG16 efter avkodning.

Behåll testfall för negativrekonstruktion, samtliga aktiva motorer, cache, ICC/import, geometri, export och manuell Editing 2.0. Radera v1/v2-lookparitet och fixtures som bara bevarar gammal estetik. Dela tester som har både tekniska och gamla estetiska assertions. Kör fysisk iPad Safari och Edge innan man inför ytterligare optimering. Överväg 3D-LUT först vid dokumenterad prestandaflaskhals. En LUT måste ge samma estetiska kontrakt och verifieras mot direktoperatorn.

Första PR:en byter arkitektur, projektmodell och UI-ägarskap i en atomisk skiva. Neutral är synlig, Gold/Ektar tillgängliga i QA. Radera gammal implementation i samma PR efter verifiering av ersättaren. Git revert återställer vid blockerande regression.
