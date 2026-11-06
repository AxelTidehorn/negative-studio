# Amber Glass 2.0 – motion

Step D follows merged A1/A2/B/C (#77–80). It changes motion, not material colors,
background SVG, photography, layout endpoints or image-processing recipes.

## Ownership and behavior

`ui-refinement.css` defines three durations (100 ms interaction, 170 ms overlay,
220 ms disclosure) and one restrained cubic-bezier easing. Reduced motion sets
all durations to zero. Focus outlines remain immediate.

`application.css` owns paint-only button/field transitions and the five native
`details` cards. `::details-content` animates a grid track with an explicit zero
minimum, so body padding/borders do not jump at the end of closing. The
body keeps its intrinsic height while the wrapper clips it, avoiding a transparent
gap under a stretched fractional grid item. The narrow
summary's status row also collapses continuously. Wide summaries retain their
existing single-row endpoint. No fixed content-height guesses, click interception,
height measurement loop, timers or animation library are used in the app.

This is progressive enhancement: `::details-content` and discrete transitions
are required (including Safari 18.4+). Older browsers retain immediate native
open/close behavior. The implementation does not require `interpolate-size`,
which WebKit does not currently support.

`workflow-ui.css` owns the floating panel/show button's opacity and 4 px vertical
entry/exit. Individual `translate` preserves the existing horizontal anchor.
`workflow-ui.js` keeps outgoing controls inert while CSS still paints them.
Five small open-attribute observers keep card bodies inert whenever closed,
including programmatic/session restoration. Native keyboard activation, open
attributes, ARIA and existing focus transfer remain the owners of interaction.

Main panel toggles remain immediate: animating workspace columns would repeatedly
resize the photo/canvas. Content is not faded to preserve opaque editing surfaces.

## Regression checks

`tests/ui-motion-browser.mjs` is included in the existing full browser suite.
It samples real intermediate and final heights in five desktop/tablet/mobile
formats, normal/reduced motion, anchored headers, rapid reversals, native touch,
keyboard editing during opening, hidden-control focus/hit exclusion and unchanged
source/pixels/histogram/recipe/analysis/geometry. The existing UI 2.1 check now
waits for the visible exit to finish before retaining its hidden-body assertion.
Three workflow/order checks similarly wait for settled opening geometry and
visible fields; their ordering, pixel, project and export assertions are retained.

Run `node tests/ui-motion-browser.mjs`, `node tests/ui-21-browser.mjs`, then
`npm run test:full`. No CI, release/version or publishing configuration changes
are needed. Physical iPad Safari/Windows Edge review remains necessary; emulated
viewports and Linux WebKit are not those devices. The pre-existing toolbar pointer
capture issue at zoom above 1 is outside this motion change.
