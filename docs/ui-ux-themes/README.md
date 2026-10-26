# Theme comparison

Actual FILMLABB screenshots at 1440 × 1000, using the bundled synthetic negative
and identical image settings. The identity and mode are encoded in each filename.
Recreate them with:

```sh
npm run build
FILMLABB_CHROMIUM_BIN=/path/to/chromium \
FILMLABB_UI_SCREENSHOTS=docs/ui-ux-themes node tests/ui-ux-browser.mjs
```

| Identity | Dark | Light |
| --- | --- | --- |
| Classic | [Dark](classic-dark.png) | [Light](classic-light.png) |
| Olive | [Dark](olive-dark.png) | [Light](olive-light.png) |
| Burgundy | [Dark](burgundy-dark.png) | [Light](burgundy-light.png) |
| Industrial | [Dark](industrial-dark.png) | [Light](industrial-light.png) |
| Paper | [Dark](paper-dark.png) | [Light](paper-light.png) |
| Aubergine | [Dark](aubergine-dark.png) | [Light](aubergine-light.png) |

The themes remain alternatives for evaluation; none is selected as a winner.
