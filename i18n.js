/* FILMLABB UI translations. Swedish is the source copy; image-processing data and project settings are never translated. */
(()=>{'use strict';
const rows=[
// Swedish | English | French | Spanish | German
['Dagläge','Day mode','Mode clair','Modo claro','Hellmodus'],
['Nattläge','Night mode','Mode sombre','Modo oscuro','Dunkelmodus'],
['Bjud på kaffe','Buy me a coffee','Offrir un café','Invítame a un café','Auf einen Kaffee'],
['+ Importera','+ Import','+ Importer','+ Importar','+ Importieren'],
['Inga bilder inlästa.','No images loaded.','Aucune image chargée.','No hay imágenes cargadas.','Keine Bilder geladen.'],
['Originalet bearbetas bara i din webbläsare.','The original is processed only in your browser.','Le fichier original est traité uniquement dans votre navigateur.','El original solo se procesa en tu navegador.','Das Original wird nur im Browser verarbeitet.'],
['Positiv','Positive','Positif','Positivo','Positiv'],['Negativ','Negative','Négatif','Negativo','Negativ'],['Jämför','Compare','Comparer','Comparar','Vergleichen'],
['Anpassa','Fit','Ajuster','Ajustar','Einpassen'],
['Läs om aktuell RAW','Reload current RAW','Recharger le RAW','Recargar RAW actual','RAW erneut laden'],
['Töm arbetskön','Clear queue','Vider la file','Vaciar cola','Warteschlange leeren'],
['Redo. Ingen bild är inläst.','Ready. No image loaded.','Prêt. Aucune image chargée.','Listo. No hay imágenes cargadas.','Bereit. Kein Bild geladen.'],
['Färgmotor','Color engine','Moteur couleur','Motor de color','Farb-Engine'],
['Beta 1 · färgmetod (referens)','Beta 1 · color method (reference)','Bêta 1 · méthode couleur (référence)','Beta 1 · método de color (referencia)','Beta 1 · Farbverfahren (Referenz)'],
['Beta 3 · förbättrad källhantering','Beta 3 · improved source handling','Bêta 3 · gestion des sources améliorée','Beta 3 · gestión de origen mejorada','Beta 3 · verbesserte Quelldaten'],
['Beta 2 · densitetsmotor (jämförelse)','Beta 2 · density engine (comparison)','Bêta 2 · moteur de densité (comparaison)','Beta 2 · motor de densidad (comparación)','Beta 2 · Dichte-Engine (Vergleich)'],
['Hitta filmruta','Find frame','Détecter la vue','Detectar fotograma','Bildfeld finden'],
['Hela bilden','Entire image','Image entière','Imagen completa','Gesamtes Bild'],
['Lås filmruta','Lock frame','Verrouiller la vue','Bloquear fotograma','Bildfeld sperren'],
['Bekräfta filmruta','Confirm frame','Confirmer la vue','Confirmar fotograma','Bildfeld bestätigen'],
['Filmruta: ingen bild inläst','Frame: no image loaded','Vue : aucune image','Fotograma: ninguna imagen','Bildfeld: kein Bild'],
['Visa filmruta · dra en sida för att justera','Show frame · drag an edge to adjust','Afficher la vue · glisser un bord pour ajuster','Mostrar fotograma · arrastra un borde','Bildfeld zeigen · Rand zum Anpassen ziehen'],
['Beskär exporten till filmrutan','Crop export to frame','Recadrer l’export à la vue','Recortar exportación al fotograma','Export auf Bildfeld zuschneiden'],
['Kreativ profil','Creative profile','Profil créatif','Perfil creativo','Kreativprofil'],
['Neutral · utan kreativ profil','Neutral · no creative profile','Neutre · sans profil créatif','Neutro · sin perfil creativo','Neutral · ohne Kreativprofil'],
['Svartvitt · neutral densitet','Black & white · neutral density','Noir et blanc · densité neutre','Blanco y negro · densidad neutra','Schwarzweiß · neutrale Dichte'],
['Profilstyrka','Profile strength','Intensité du profil','Intensidad del perfil','Profilstärke'],
['0 % = Neutral. Påverkar endast den kreativa profilen.','0% = Neutral. Only affects the creative profile.','0 % = Neutre. Affecte uniquement le profil créatif.','0 % = Neutro. Solo afecta al perfil creativo.','0 % = Neutral. Betrifft nur das Kreativprofil.'],
['Positiv återgivning','Positive rendering','Rendu positif','Revelado positivo','Positivdarstellung'],
['Neutral kopia','Neutral print','Tirage neutre','Copia neutra','Neutrale Kopie'],
['Mjuk kopia · mer högdagermarginal','Soft print · more highlight latitude','Tirage doux · plus de marge dans les hautes lumières','Copia suave · mayor margen en luces','Weiche Kopie · mehr Lichterspielraum'],
['Klassisk kopia · tydligare mellantoner','Classic print · stronger midtones','Tirage classique · tons moyens renforcés','Copia clásica · medios tonos definidos','Klassische Kopie · kräftigere Mitteltöne'],
['Hur kommer jag igång?','Getting started','Premiers pas','Cómo empezar','Erste Schritte'],
['Hämta ett syntetiskt testnegativ','Download a synthetic test negative','Télécharger un négatif test synthétique','Descargar un negativo de prueba sintético','Synthetisches Testnegativ herunterladen'],
['(inte ett riktigt filmskann).','(not a real film scan).','(pas un vrai scan de film).','(no es un escaneo real).','(kein echter Filmscan).'],
['Framkallning','Development','Développement','Revelado','Entwicklung'],
['Bildjustering','Image adjustments','Réglages de l’image','Ajustes de imagen','Bildanpassungen'],
['Välj en profil.','Choose a profile.','Choisissez un profil.','Elige un perfil.','Profil auswählen.'],
['Ingen bild','No image','Aucune image','Sin imagen','Kein Bild'],
['Gemensamma ändringar','Shared adjustments','Réglages partagés','Ajustes compartidos','Gemeinsame Anpassungen'],
['Gemensam ändring','Shared adjustment','Réglage partagé','Ajuste compartido','Gemeinsame Anpassung'],
['Endast färg','Color only','Couleur seulement','Solo color','Nur Farbe'],
['Endast ton','Tone only','Tons seulement','Solo tono','Nur Tonwerte'],
['Alla justeringar utom exponering','All adjustments except exposure','Tous les réglages sauf exposition','Todos salvo exposición','Alle außer Belichtung'],
['Kopiera till markerade','Copy to selected','Copier vers la sélection','Copiar a seleccionados','Auf Auswahl übertragen'],
['Ljuskälla och bildanalys','Light source and image analysis','Source lumineuse et analyse','Fuente de luz y análisis','Lichtquelle und Bildanalyse'],
['Ljuskällereferens','Light-source reference','Référence de lumière','Referencia de iluminación','Lichtquellenreferenz'],
['Nollställ referens','Clear reference','Effacer la référence','Borrar referencia','Referenz löschen'],
['Ingen referens vald','No reference selected','Aucune référence','Sin referencia seleccionada','Keine Referenz gewählt'],
['TIFF utan ICC','TIFF without ICC','TIFF sans ICC','TIFF sin ICC','TIFF ohne ICC'],
['Anta sRGB','Assume sRGB','Supposer sRGB','Suponer sRGB','sRGB annehmen'],
['Anta linjär sRGB','Assume linear sRGB','Supposer sRGB linéaire','Suponer sRGB lineal','Lineares sRGB annehmen'],
['Symmetrisk filmruta','Symmetric frame','Vue symétrique','Fotograma simétrico','Symmetrisches Bildfeld'],
['Avancerad konvertering och färgkalibrering','Advanced conversion and color calibration','Conversion avancée et calibration des couleurs','Conversión avanzada y calibración de color','Erweiterte Konvertierung und Farbkalibrierung'],
['Filmbas och mask','Film base and mask','Base du film et masque','Base de película y máscara','Filmbasis und Maske'],
['Beräkna filmbas automatiskt','Estimate film base automatically','Estimer la base automatiquement','Estimar base automáticamente','Filmbasis automatisch schätzen'],
['Välj filmbas med pipett','Pick film base with eyedropper','Prélever la base à la pipette','Seleccionar base con cuentagotas','Filmbasis mit Pipette wählen'],
['Analysera igen','Analyze again','Analyser à nouveau','Analizar de nuevo','Erneut analysieren'],
['Ingen pålitlig filmbas (motivbaserad)','No reliable film base (scene-based)','Pas de base fiable (analyse de scène)','Sin base fiable (según escena)','Keine verlässliche Filmbasis (motivbasiert)'],
['Spara som rullens filmbas','Save as roll film base','Enregistrer comme base du rouleau','Guardar como base del rollo','Als Filmbasis der Rolle speichern'],
['Rensa rullreferens','Clear roll reference','Effacer la référence du rouleau','Borrar referencia del rollo','Rollenreferenz löschen'],
['Använd rullens filmbas','Use roll film base','Utiliser la base du rouleau','Usar base del rollo','Filmbasis der Rolle verwenden'],
['Filmbas: ej analyserad.','Film base: not analyzed.','Base du film : non analysée.','Base: sin analizar.','Filmbasis: nicht analysiert.'],
['Automatisk positivframkallning','Automatic positive development','Développement positif automatique','Revelado positivo automático','Automatische Positiventwicklung'],
['Automatiskt tonomfång','Automatic tonal range','Plage tonale automatique','Rango tonal automático','Automatischer Tonwertumfang'],
['Beräkna nivåer igen','Recalculate levels','Recalculer les niveaux','Recalcular niveles','Tonwerte neu berechnen'],
['Nivåer: inte analyserade.','Levels: not analyzed.','Niveaux : non analysés.','Niveles: sin analizar.','Tonwerte: nicht analysiert.'],
['Fler justeringar','More adjustments','Autres réglages','Más ajustes','Weitere Anpassungen'],
['Återställ reglage','Reset sliders','Réinitialiser les curseurs','Restablecer controles','Regler zurücksetzen'],
['Batch-export och projekt','Batch export and projects','Exportation par lot et projets','Exportación por lotes y proyectos','Stapelexport und Projekte'],
['Exportera rullen som JPEG-ZIP','Export roll as JPEG ZIP','Exporter le rouleau en ZIP JPEG','Exportar rollo como ZIP JPEG','Rolle als JPEG-ZIP exportieren'],
['TIFF för markerade (max 5)','TIFF for selected (max 5)','TIFF sélectionnés (max. 5)','TIFF seleccionados (máx. 5)','TIFF für Auswahl (max. 5)'],
['Inställningar','Settings','Paramètres','Ajustes','Einstellungen'],
['Exportera rullprojekt (JSON)','Export roll project (JSON)','Exporter le projet (JSON)','Exportar proyecto (JSON)','Rollenprojekt exportieren (JSON)'],
['Importera JSON','Import JSON','Importer JSON','Importar JSON','JSON importieren'],
['RAW-avkodning och bildbehandling sker lokalt. Beta 1 är referensmotorn; Beta 2 och 3 är experimentella. Export: JPEG och TIFF med sRGB. Färgprecisionen är ännu inte fullt verifierad.','RAW decoding and processing run locally. Beta 1 is the reference engine; Beta 2 and 3 are experimental. Export: JPEG and TIFF in sRGB. Color accuracy is not yet fully validated.','Décodage RAW et traitement locaux. Bêta 1 sert de référence ; Bêta 2 et 3 sont expérimentales. Export JPEG et TIFF en sRGB. La précision couleur reste à valider.','Decodificación RAW y procesado locales. Beta 1 es la referencia; Beta 2 y 3 son experimentales. Exportación JPEG y TIFF en sRGB. La precisión del color aún no está validada.','RAW-Dekodierung und Bildverarbeitung erfolgen lokal. Beta 1 ist die Referenz; Beta 2 und 3 sind experimentell. Export: JPEG und TIFF in sRGB. Farbgenauigkeit noch nicht vollständig geprüft.'],
['Exponering','Exposure','Exposition','Exposición','Belichtung'],
['Kontrast','Contrast','Contraste','Contraste','Kontrast'],
['Varm / kall','Warm / cool','Chaud / froid','Cálido / frío','Warm / kühl'],
['Grön / magenta','Green / magenta','Vert / magenta','Verde / magenta','Grün / Magenta'],
['Färgmättnad','Saturation','Saturation','Saturación','Sättigung'],
['Highlights','Highlights','Hautes lumières','Altas luces','Lichter'],['Shadows','Shadows','Ombres','Sombras','Schatten'],['Exponering','Exposure','Exposition','Exposición','Belichtung'],['Skuggor','Shadows','Ombres','Sombras','Schatten'],
['Högdagrar','Highlights','Hautes lumières','Altas luces','Lichter'],
['Svartpunkt','Black point','Point noir','Punto negro','Schwarzpunkt'],
['Vitpunkt','White point','Point blanc','Punto blanco','Weißpunkt']
];
const extra=[
['Välj JPEG, PNG, WebP, TIFF, RAF eller DNG. RAF försöker läsa riktig 16-bitars RAW med LibRaw. Om det misslyckas erbjuds JPEG-förhandsbilden som reserv.',
'Select JPEG, PNG, WebP, TIFF, RAF or DNG. RAF attempts full 16-bit RAW decoding with LibRaw; if it fails, a JPEG preview fallback is offered.',
'Sélectionnez JPEG, PNG, WebP, TIFF, RAF ou DNG. Le décodage RAW 16 bits utilise LibRaw ; en cas d’échec, un aperçu JPEG est proposé.',
'Selecciona JPEG, PNG, WebP, TIFF, RAF o DNG. Se intenta decodificar RAW de 16 bits con LibRaw; si falla, se ofrece una vista JPEG.',
'JPEG, PNG, WebP, TIFF, RAF oder DNG wählen. RAF wird mit LibRaw als 16-Bit-RAW dekodiert; andernfalls steht eine JPEG-Vorschau bereit.'],
['RAW avkodas i 16 bitar vid import; endast visningen har lägre upplösning.','RAW is decoded at 16-bit precision on import; only the preview has reduced resolution.','Le RAW est décodé en 16 bits ; seul l’aperçu est réduit.','RAW se decodifica a 16 bits; solo la vista previa tiene menor resolución.','RAW wird mit 16 Bit dekodiert; nur die Vorschau ist verkleinert.'],
['Analysen använder bara filmrutan, med 1,2 % säkerhetsmarginal. Originalfilen ändras aldrig.','Analysis uses only the frame with a 1.2% safety margin. The source file is never modified.','L’analyse utilise uniquement la vue avec une marge de 1,2 %. Le fichier source reste intact.','El análisis usa solo el fotograma con margen del 1,2 %. El original no se modifica.','Die Analyse nutzt nur das Bildfeld mit 1,2 % Sicherheitsrand. Die Quelldatei bleibt unverändert.'],
['Välj Beta 3 för filmruteberoende analys. Båda lägena delar korrigerad import; jämför med den äldre appen för exakt Beta 1-bild.','Select Beta 3 for frame-based analysis. Both modes share the updated import pipeline; compare with the old app for exact Beta 1 output.','Choisissez Bêta 3 pour une analyse par vue. Les modes partagent l’import corrigé ; comparez l’ancienne application pour le rendu exact de Bêta 1.','Elige Beta 3 para analizar el fotograma. Los modos comparten la importación corregida; compara con la app anterior para Beta 1 exacta.','Beta 3 für bildfeldbasierte Analyse wählen. Beide Modi nutzen den korrigierten Import; für exakte Beta-1-Bilder mit der alten App vergleichen.'],
['Inställningar sparas automatiskt på enheten. Du kan också exportera och importera en projektfil för säkerhetskopia och för att återanvända inställningar.','Settings are saved locally. Export or import a project file to back up and reuse adjustments.','Les réglages sont enregistrés sur cet appareil. Exportez ou importez un projet pour les sauvegarder et les réutiliser.','Los ajustes se guardan en el dispositivo. Exporta o importa un proyecto para guardarlos y reutilizarlos.','Einstellungen werden lokal gespeichert. Projektdateien können zur Sicherung und Wiederverwendung exportiert oder importiert werden.'],
['Originalbilden lagras inte med inställningarna. Ladda in den igen vid nästa session.','Original images are not stored with settings. Import them again next time.','Les originaux ne sont pas enregistrés avec les réglages. Réimportez-les lors de la prochaine session.','Los originales no se guardan con los ajustes. Vuelve a importarlos en la próxima sesión.','Originalbilder werden nicht mit den Einstellungen gespeichert. Beim nächsten Mal erneut importieren.'],
['Utan synlig oexponerad filmkant är automatiken en osäker uppskattning. Välj Filmbas saknas för en alternativ grundkonvertering eller använd pipetten om en exponeringsfri kant finns.','Without visible unexposed film edges, automatic film-base detection is uncertain. Use scene-based mode or sample an unexposed edge with the eyedropper.','Sans bord de film non exposé, l’estimation automatique est incertaine. Utilisez le mode basé sur la scène ou la pipette sur un bord non exposé.','Sin borde de película sin exponer, la detección automática es incierta. Usa el modo basado en escena o toma una muestra del borde.','Ohne sichtbaren unbelichteten Filmrand ist die automatische Schätzung unsicher. Motivbasierten Modus oder Pipette am unbelichteten Rand verwenden.'],
['Beta 2 använder densitet och ett gemensamt tonomfång. Motivet antas inte vara grått i genomsnitt. Utan uppmätt filmbas är färgen fortfarande en uppskattning.','Beta 2 uses optical density and a shared tonal range. It does not assume the scene averages to gray; without a measured film base, color remains an estimate.','Bêta 2 utilise la densité et une plage tonale commune. La scène n’est pas supposée grise en moyenne ; sans mesure de base, la couleur reste estimée.','Beta 2 usa densidad y un rango tonal común. No presupone una escena gris; sin medir la base, el color sigue siendo estimado.','Beta 2 nutzt Dichte und gemeinsamen Tonwertumfang. Es wird kein durchschnittlich graues Motiv angenommen; ohne gemessene Filmbasis bleibt Farbe geschätzt.'],
['Importera upp till fem digitaliserade negativ, välj Färg eller Svartvitt, justera efter smak och exportera. Bilder skickas inte till någon server. Creative Profiles är estetiska tolkningar, inte exakta kopior av filmeumulsioner. DNG-stödet beror på LibRaw och kameramodell. ',
'Import up to five scanned negatives, choose color or black and white, adjust and export. Images are not uploaded. Creative profiles are aesthetic interpretations, not film-emulsion matches. DNG support depends on LibRaw and camera model. ',
'Importez jusqu’à cinq négatifs, choisissez couleur ou noir et blanc, ajustez et exportez. Les images restent locales. Les profils créatifs sont des interprétations esthétiques ; la prise en charge DNG dépend de LibRaw et du boîtier. ',
'Importa hasta cinco negativos, elige color o blanco y negro, ajusta y exporta. No se suben las imágenes. Los perfiles creativos son interpretaciones estéticas; DNG depende de LibRaw y la cámara. ',
'Bis zu fünf Negative importieren, Farbe oder Schwarzweiß wählen, anpassen und exportieren. Bilder werden nicht hochgeladen. Kreativprofile sind ästhetische Interpretationen; DNG hängt von LibRaw und Kamera ab. ']
];
extra.push(...[["Beta 1 · korrigerad analys", "Beta 1 · corrected analysis", "Bêta 1 · analyse corrigée", "Beta 1 · análisis corregido", "Beta 1 · korrigierte Analyse"], ["Beta 3.8 · densitet och kanallutning (test)", "Beta 3.8 · density and channel slopes (test)", "Bêta 3.8 · densité et pentes des canaux (test)", "Beta 3.8 · densidad y pendientes de canal (prueba)", "Beta 3.8 · Dichte und Kanalsteigungen (Test)"], ["Beta 3.7 · oförändrad referens", "Beta 3.7 · unchanged reference", "Bêta 3.7 · référence inchangée", "Beta 3.7 · referencia sin cambios", "Beta 3.7 · unveränderte Referenz"], ["Röd kanallutning", "Red channel slope", "Pente du canal rouge", "Pendiente del canal rojo", "Steigung Rotkanal"], ["Blå kanallutning", "Blue channel slope", "Pente du canal bleu", "Pendiente del canal azul", "Steigung Blaukanal"], ["Kanallutningarna används bara i densitetsvarianten. 1,00 är neutralt.", "Channel slopes apply only to the density variant. 1.00 is neutral.", "Les pentes ne concernent que la variante de densité. 1,00 est neutre.", "Las pendientes solo se aplican a la variante de densidad. 1,00 es neutro.", "Kanalsteigungen gelten nur für die Dichtevariante. 1,00 ist neutral."], ["Beta 1 använder korrigerad filmruteanalys. Densitetsvarianten utvärderas mot referensen från 3.7.", "Beta 1 uses corrected frame analysis. The density variant is evaluated against the 3.7 reference.", "Bêta 1 utilise une analyse corrigée. La variante de densité est comparée à la référence 3.7.", "Beta 1 usa análisis de fotograma corregido. La variante de densidad se compara con la referencia 3.7.", "Beta 1 nutzt korrigierte Bildfeldanalyse. Die Dichtevariante wird mit Referenz 3.7 verglichen."]]);
extra.push(...[["Beta 3.9 · automatisk färg", "Beta 3.9 · automatic color", "Bêta 3.9 · couleur automatique", "Beta 3.9 · color automático", "Beta 3.9 · automatische Farbe"], ["Beta 3.7 · äldre färgmetod", "Beta 3.7 · earlier color method", "Bêta 3.7 · ancienne méthode couleur", "Beta 3.7 · método de color anterior", "Beta 3.7 · frühere Farbmethode"], ["Beta 3.8 · densitetstest", "Beta 3.8 · density test", "Bêta 3.8 · test de densité", "Beta 3.8 · prueba de densidad", "Beta 3.8 · Dichtetest"], ["3.9 balanserar kanalernas densitetskurvor. Äldre färgmetoder finns kvar för jämförelse. Alla lägen använder korrigerad RAW-import.", "3.9 balances channel density curves. Earlier color methods remain available for comparison. All modes use corrected RAW import.", "3.9 équilibre les courbes de densité des canaux. Les anciennes méthodes restent disponibles pour comparaison. Tous les modes utilisent l’import RAW corrigé.", "3.9 equilibra las curvas de densidad de los canales. Los métodos anteriores siguen disponibles para comparar. Todos los modos usan la importación RAW corregida.", "3.9 gleicht die Dichtekurven der Kanäle ab. Frühere Methoden bleiben zum Vergleich verfügbar. Alle Modi nutzen den korrigierten RAW-Import."], ["Neutralpipett", "Neutral eyedropper", "Pipette neutre", "Cuentagotas neutro", "Neutralpipette"], ["Välj en neutral yta i motivet…", "Select a neutral area in the scene…", "Sélectionnez une zone neutre du sujet…", "Selecciona una zona neutra del motivo…", "Eine neutrale Fläche im Motiv wählen…"], ["Välj en känd neutral grå yta i motivet, inte hud eller en klippt högdager.", "Select a known neutral gray area, avoiding skin and clipped highlights.", "Sélectionnez une zone grise neutre connue, sans peau ni hautes lumières écrêtées.", "Selecciona una zona gris neutra conocida, evitando piel y luces recortadas.", "Eine bekannte neutralgraue Fläche wählen, keine Haut oder ausgefressenen Lichter."], ["Positiv färgbalans justerad från neutralprovet.", "Positive color balance adjusted from the neutral sample.", "Balance couleur du positif ajustée sur l’échantillon neutre.", "Balance de color del positivo ajustado con la muestra neutra.", "Farbbalance des Positivs anhand der Neutralprobe angepasst."], ["Provet är för mörkt eller klippt. Välj en mellangrå yta.", "The sample is too dark or clipped. Select a mid-gray area.", "Échantillon trop sombre ou écrêté. Sélectionnez un gris moyen.", "La muestra es demasiado oscura o está recortada. Selecciona un gris medio.", "Probe zu dunkel oder beschnitten. Eine mittelgraue Fläche wählen."], ["Välj en neutral yta innanför filmrutan.", "Select a neutral area inside the film frame.", "Sélectionnez une zone neutre à l’intérieur de la vue.", "Selecciona una zona neutra dentro del fotograma.", "Eine neutrale Fläche innerhalb des Bildfelds wählen."], ["Neutralpipetten avbruten.", "Neutral eyedropper cancelled.", "Pipette neutre annulée.", "Cuentagotas neutro cancelado.", "Neutralpipette abgebrochen."], ["Kanallutningarna används bara i det äldre densitetstestet. Neutralpipetten ändrar positivets färgbalans och lämnar filmbasen orörd.", "Channel slopes apply only to the earlier density test. The neutral eyedropper adjusts positive color balance without changing film base.", "Les pentes concernent l’ancien test de densité. La pipette neutre ajuste le positif sans modifier la base du film.", "Las pendientes solo se aplican a la prueba anterior de densidad. El cuentagotas ajusta el positivo sin cambiar la base.", "Kanalsteigungen gelten nur für den früheren Dichtetest. Die Neutralpipette ändert die Positivfarbe, nicht die Filmbasis."]]);
for(const r of extra)rows.push(r);
const langs=['sv','en','fr','es','de'];const dict=Object.create(null);for(const r of rows)dict[r[0]]=r;
const select=document.getElementById('languageSelect');if(!select)return;
const pref='filmlabb-language-v1';let selected;try{selected=localStorage.getItem(pref)}catch{};if(!langs.includes(selected))selected=langs.includes((navigator.language||'en').slice(0,2).toLowerCase())?(navigator.language||'en').slice(0,2).toLowerCase():'en';
let current='sv';const originals=new WeakMap();const protectedTags=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
function translateNode(node){if(node.nodeType===3){const actual=node.nodeValue;let base=originals.get(node);if(base===undefined){base=actual;originals.set(node,base)}else if(actual!==base&&!langs.some(l=>actual===translation(base,l))){// App updated the value: use this as new Swedish source.
 base=actual;originals.set(node,base)}const target=translation(base,selected);if(actual!==target)node.nodeValue=target;return}if(node.nodeType!==1||protectedTags.has(node.tagName)||node.closest?.('svg'))return;
 if(node.hasAttribute('aria-label')){const original=node.dataset.sourceAria||node.getAttribute('aria-label');node.dataset.sourceAria=original;node.setAttribute('aria-label',translation(original,selected).trim())}
 for(const n of Array.from(node.childNodes))translateNode(n);
}
function translation(text,lang){if(lang==='sv')return text;const raw=text.trim();const r=dict[raw];if(!r)return text;const pre=text.match(/^\s*/)?.[0]||'',post=text.match(/\s*$/)?.[0]||'';return pre+r[langs.indexOf(lang)]+post}
function setLanguage(lang){selected=langs.includes(lang)?lang:'en';current=selected;select.value=selected;document.documentElement.lang=selected;document.querySelectorAll('main,header,.foot').forEach(translateNode);try{localStorage.setItem(pref,selected)}catch{}}
select.addEventListener('change',e=>setLanguage(e.target.value));
// Re-apply when existing code updates UI messages; avoid observing the entire preview/canvas subtree.
let busy=false;const observer=new MutationObserver(records=>{if(busy)return;busy=true;queueMicrotask(()=>{observer.disconnect();const nodes=new Set();for(const r of records){if(r.type==='characterData')nodes.add(r.target);else for(const n of r.addedNodes)nodes.add(n);}for(const node of nodes)translateNode(node);observer.observe(document.body,{subtree:true,childList:true,characterData:true});busy=false})});
setLanguage(selected);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
window.FILMLABB_LANGUAGE={get:()=>selected,set:setLanguage};
})();
