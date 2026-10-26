import fs from 'node:fs';
export const browserExecutable=()=>process.env.FILMLABB_CHROMIUM_BIN||['/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
/* A runner-owned process, with a separate Playwright connection per suite.
   Closing the connection disposes its contexts, not the shared server/browser. */
export async function launchBrowser(options={}){const {chromium}=await import(process.env.FILMLABB_PLAYWRIGHT_MODULE||'playwright');return process.env.FILMLABB_BROWSER_WS?chromium.connect(process.env.FILMLABB_BROWSER_WS):chromium.launch({...options,executablePath:options.executablePath||browserExecutable()});}
