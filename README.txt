Negative Studio v0.4 – experimentell RAW-integrering (KÄLLKOD, EJ FÄRDIG IPAD-APP)

Viktigt: detta ZIP-arkiv innehåller INTE LibRaw WebAssembly. Det är inte en körbar offline-RAW-version direkt.

Bygg via GitHub Actions (utan egen dator):
1. Skapa ett privat GitHub-repo och lägg in innehållet från detta ZIP i repo-roten inklusive .github/workflows/build.yml.
2. Öppna Actions > Build offline RAW prototype > Run workflow.
3. Hämta artefakten Negative-Studio-v0.4-WASM. I dess site-mapp ligger HTML plus LibRaw JS/WASM lokalt.
4. För webbläsartestning behöver hela site-mappen serveras via HTTP/HTTPS; file:// kan blockera Web Workers och WASM.

OBS: WebAssembly-filer som placeras lokalt bredvid HTML gör bildbehandlingen oberoende av nätverket, men offline-start på iPad behöver fortfarande lösas med korrekt PWA-cache eller lokal server.

RAWintegration: anropar libraw-wasm, begär 16-bitars RGB, använder separat snabb 8-bitars preview och behåller RGB16 för TIFF-export. Vid fel visas en fråga innan appen använder embedded JPEG.

BEGRÄNSNINGAR: Ingen körning av denna version på din RAF har kunnat utföras här eftersom nätverksåtkomst till npm-paket saknas. libraw-wasm kan ha andra inställningsnamn eller iPad-begränsningar. Komprimerad X-Trans RAF kan eventuellt sakna avkodarstöd. Denna version påstår inte filmkalibrerade färger.
