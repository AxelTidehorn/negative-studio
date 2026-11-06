# Amber Glass 2.0 – motion (D / D2)

D2 follows merged #81. Materials, background SVG, photographic algorithms,
layout endpoints, sidebar width preferences and project recipes are unchanged.

## Motion roles and native cards

`ui-refinement.css` defines 100 ms interaction, 170 ms overlay and 300 ms panel
roles, with `cubic-bezier(.25,.1,.25,1)`. D2 compared D's 220 ms curve with 280 ms
and 300 ms profiles. The 300 ms variant gives a less abrupt large expansion.
Reduced motion sets durations to zero; focus outlines stay immediate.

`application.css` owns the five native cards. `::details-content` transitions
`minmax(0,0fr)` to `minmax(0,1fr)`. The opaque body keeps its intrinsic height;
the wrapper clips it, avoiding a transparent gap during closing. No fixed maximum
content height, app height loop, native-click interception or extra wrapper exists.

D's more-specific animation rule restored `.card-status {display:block}`, overriding
the older open-state `display:none`. A zero-height grid row alone did not establish
an actually hidden caption. D2 explicitly hides it immediately on opening and
reveals it after closing's row transition. Closed headers keep their original
geometry; open headers have no painted caption fragments. Wide headers keep the
existing side-by-side layout. The caption regression covers all five cards and
languages, including Export and projects.

Native disclosure enhancement requires `::details-content` and discrete
transitions (Safari 18.4+); no `interpolate-size` is required. Older engines retain
immediate native behavior. `workflow-ui.js` keeps outgoing disclosure bodies inert,
including API/session changes, without delaying the native open state.

## Main panels: animate the panel, commit the viewport once

`workspace-layout.js` remains the owner of visibility/preferences. An outgoing
panel is inert immediately, with its old grid/flex slot retained by a temporary
`*-exiting` marker. Opacity and a small translate animate independently. Completion
removes that marker and commits the final layout once. Entry applies the final
layout once and animates the arriving panel. The photograph is never transformed,
crossfaded or copied for the animation. A legitimate final fit can change its
screen size once, as with the original direct toggle; no intermediate stretched
photographs or continuously resized canvases are introduced.

The bounded animation map cancels superseded finishes on rapid reversals. Viewport
resize, divider drag and reduced-motion changes finish/cancel pending presentation
and retain the latest desired flags. Focus leaves an exiting panel without forcing
scroll. Sidebar/filmstrip offsets are captured and restored explicitly because
WebKit can discard them when display becomes none. Both panels, focus mode and layout reset share this path. Responsive
expanded-width roles reuse exactly the previous desktop/tablet values. No breakpoint
or permanent width changes. The rendering/geometry owners remain unchanged.

A direct grid-transition probe caused nine intermediate viewport widths and seven
presentation draws on the recorded local fixture; it was rejected. Chosen-path
regressions bound viewport changes to initial/final sizes and verify unchanged
zoom, crop, source, pixel results, analysis and preferences. Counts are fixture
measurements, not physical-device performance guarantees.

## Other surfaces

`workflow-ui.css` owns the existing image toolbar/show button, a short settings-menu
entry/exit, and the internal geometry disclosure. Their hidden controls are inert.
The export progress panel has entry-only motion: native hide is immediate so a
finished export never leaves its cancel control interactive. Progress value/text
updates do not restart the entry. The original-detail photograph is not animated.
Existing frame/selected/segmented paint transitions are reused, without thumbnail
or photograph crossfades. No `transition:all`, permanent `will-change`, library,
new editing controls or material layer is introduced.

## Verification

Run `node tests/ui-motion-browser.mjs`, `node tests/ui-motion-d2-browser.mjs`,
`node tests/ui-21-browser.mjs` and `npm run test:full`. The new D2 browser suite is
registered in Full. It covers captions, languages, native focus/touch, opaque
coverage, panel reversals/interruption, viewport commits, zoom/crop/pixel invariance
and width/scroll retention. Static layout checks wait for their real transition
endpoints rather than asserting a mid-animation order.

Physical iPad Safari/Windows Edge review remains necessary. Linux WebKit and
Chromium touch viewports are useful compatibility checks, not those devices.
The historical toolbar pointer-capture behavior above zoom 1 is outside this work.
The online build-identity spec continues to block service workers: the unchanged
main offline navigation shell can replace `v2.html` after activation. That separate
lab navigation issue, versioning, CI and publishing are not changed by D2.
