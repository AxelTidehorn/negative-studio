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

## Main panels: one continuous grid transition

`workspace-layout.js` still owns visibility/preferences. A single native CSS
transition interpolates the existing five grid tracks, using the shared 300 ms
panel duration/easing. The left panel is full-width and aligned to its track's
right edge; the right panel is full-width and aligned to its track's left edge.
Their contents ride out through the workspace edges without squeezing or fading.
The photographic viewport's edges follow those same tracks continuously.

The D2 opacity/translate animations, retained exit slots and animation map are
removed. Native CSS transitions reverse from their interpolated position. A
completion generation prevents superseded finishes from hiding a reopened panel.
Resize, divider drag and reduced-motion changes settle to the latest requested
state. Outgoing panels become inert immediately; focus returns without scrolling.
Existing saved widths and panel/filmstrip scroll restoration are retained.

During motion the workspace clips outgoing panels to its existing side gutters;
no document overflow or new wrapper is needed. End-state geometry, breakpoints,
materials and card/button animations are unchanged. Below 761 px the existing
stacked phone layout switches immediately, as does reduced motion everywhere.
It has no shared horizontal grid and is not replaced with a different layout.

`FILMLABB_GEOMETRY.resizeView()` updates CSS Fit and vector hit targets only.
The existing bounded presentation bitmap depends on source/composition, **not**
on viewport dimensions. Its ResizeObserver and the layout owner reuse that bitmap
rather than calling the pixel/presentation renderer for each grid frame. Zoom,
pan, source coordinates and composition retain their existing definitions; the
browser composites the same pixels at the continuously updated display size.
The final available height is measured once per toggle (without painting), so
responsive status/control wrapping cannot jump the photograph vertically. That
height follows the same eased grid progress; it is discarded on completion or
interruption. Actual source/edit/geometry changes still use the unchanged
draw/render path.
No photograph copy, extra GPU pass or alternative rendering pipeline is added.

The browser regression verifies intermediate edge synchronization, fixed panel
content widths, no separate opacity/translate animation, no overflow, unchanged
bitmap sizes and zero presentation draws/color uploads/conversion frames during
panel motion. Portrait iPad also exercises CPU presentation fallback. Rapid
reversals must preserve the immediately visible position. These are functional
checks on Chromium/Linux-WebKit, not physical-device frame-rate guarantees.
Native transition positions are also sampled at controlled times, then replayed
in real time: interpolation correctness must not depend on a shared CI host
presenting three frames within 300 ms.

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
coverage, panel reversals/interruption, synchronized viewport edges, zoom/crop/pixel invariance
and width/scroll retention. Static layout checks wait for their real transition
endpoints rather than asserting a mid-animation order.

Physical iPad Safari/Windows Edge review remains necessary. Linux WebKit and
Chromium touch viewports are useful compatibility checks, not those devices.
The historical toolbar pointer-capture behavior above zoom 1 is outside this work.
The online build-identity spec continues to block service workers: the unchanged
main offline navigation shell can replace `v2.html` after activation. That separate
lab navigation issue, versioning, CI and publishing are not changed by D2.

The manual-frame VM fixture supplies the native media/style API methods now used
by the layout owner; all coordinate and project assertions are retained. UI3's
numeric field check and UI 2.0.2's static sidebar checks wait for actual visibility
or transition completion. The normal-motion regression separately tests the
intermediate states, inert exits and continuous photographic viewport changes without pixel redraws.
The V2-default browser fixture clears its completion status before selecting the
next project file: otherwise its wait could accept the previous project's same
message before the new load began. All historical engine/pixel assertions remain;
the production project controller is unchanged.
The V2-platform project round-trip fixture uses the same fresh-status wait,
including its reload of two consecutive algorithm-3 projects before a frame click.
