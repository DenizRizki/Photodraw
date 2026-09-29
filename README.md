# Photodraw

AR drawing in the browser. Point your phone at a printed marker, draw on the surface
that appears over it, and save the result as a real photo. No app install, no build step.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Skeleton, marker tracking, device checks, HUD | **Done** |
| 2 | Drawing engine (raycast to canvas texture, colors, undo/redo) | Next |
| 3 | Capture and save / share the AR photo | Planned |
| 4 | PWA, polish, custom branded marker | Planned |

In phase 1 the marker is detected and a gridded "draw surface" is pinned to it.
Drawing is not implemented yet.

## How it works

1. A-Frame renders a WebGL canvas with `alpha: true`, so the camera video shows through.
2. MindAR image tracking finds `assets/card.mind` in the camera feed.
3. A 1 x 0.552 unit plane is anchored to the marker, exactly matching the card's 1.812 aspect ratio.
4. The grid you see is a `THREE.CanvasTexture` on that plane. Phase 2 replaces its
   contents with a drawing canvas.

## Running it

```bash
npx serve .
# then open http://localhost:3000
```

`localhost` is a secure context, so the camera works on the same machine.

> The local folder is still called `DrawHelper` while the project and repo are
> `Photodraw`. That is intentional, not a leftover. Nothing references the folder
> name, every path in the code is relative, and the repo name comes from the git
> remote. Rename the folder whenever you like.

### Testing on a phone

Browsers block camera access on plain `http://` for any host that is not `localhost`.
This is the single most common reason "the camera does nothing" on mobile. Two options:

**Deploy (easiest, gives real HTTPS):** the repo is
<https://github.com/DenizRizki/Photodraw>, connected to Vercel. See below.

**Tunnel from your machine:**

```bash
npx localtunnel --port 3000
```

Then open the `*.loca.lt` URL on the phone and accept the certificate warning.

To get a marker in front of the camera, either print `assets/card.png`, or open
`index.html` on a second device and tap **Show the marker**. Keep it flat, evenly lit,
and filling most of the frame.

## Deploying to Vercel

The repo is <https://github.com/DenizRizki/Photodraw>, connected to a Vercel project.
There is no build step, so Vercel serves the repository root as static files.

| Setting | Value |
| --- | --- |
| Framework Preset | `Other` |
| Root Directory | `/` |
| Build Command | leave empty |

`vercel.json` sets two response headers:

- `Cache-Control: immutable` for `vendor/`. Those filenames carry their version, so
  replacing a library changes the URL and stale caches never bite.
- `Content-Type: application/octet-stream` for `assets/card.mind`. MindAR only ever
  does `fetch().arrayBuffer()`, so the type does not actually matter, this just stops
  a host from guessing `text/plain` and mangling the binary.

The `.mind` path is spelled out exactly rather than as a wildcard. A pattern like
`/assets/:file` would also match `card.png` and serve the marker image as
`application/octet-stream`, which breaks its `<img>` tag.

Deploying from the CLI is fine too, but run it from inside this folder:

```bash
cd C:\Users\Deniz\DrawHelper
npx vercel --prod
```

Note that `C:\Users\Deniz` is itself a git repository and this folder is nested inside
it. Always `git init` here, in `DrawHelper`, so git does not operate on the parent
repository that spans the whole user profile.

## Dependencies

All libraries are vendored in `vendor/`, so the app has no runtime CDN dependency and
works offline after first load.

| File | Version | License |
| --- | --- | --- |
| `vendor/aframe-1.5.0.min.js` | A-Frame 1.5.0 | MIT |
| `vendor/mindar-image-1.1.4.prod.js` | MindAR 1.1.4 | MIT |
| `vendor/mindar-image-aframe-1.1.4.prod.js` | MindAR 1.1.4 | MIT |

### Why MindAR 1.1.4 and not 1.2.5

This is deliberate, do not "upgrade" it without re-testing.

In MindAR 1.2.5 the npm build of `mindar-image.prod.js` was code-split into ES modules
(`import { C } from "./controller-mGt1s8dJ.js"`) and can no longer be loaded with a plain
`<script src>` tag. It throws `SyntaxError: Cannot use import statement outside a module`
and `window.MINDAR` is never defined, so tracking silently never starts. The GitHub
(`cdn.jsdelivr.net/gh/...`) copies served correctly for a while but are unstable and can
be ORB-blocked by the browser.

MindAR 1.1.4 still ships the classic self-contained IIFE pair that the official quick
start uses, and its `.mind` marker format is byte-identical to 1.2.5's
(`assets/card.mind` is unchanged). This is the combination tested here.

### Note on the MindAR 1.1.4 API

1.1.4 predates the 1.2 event rename, so the events are **not** the ones in current docs:

| Event | Meaning |
| --- | --- |
| `arReady` | Tracker started, camera running |
| `targetFound` | Marker locked |
| `targetLost` | Marker lost |
| `arError` | Camera failure, `detail.error === "VIDEO_FAIL"` |

The registered system is also named `mindar-image-system`, not `mindar-image`
(`mindar-image` is the component). Its built-in DOM overlays are turned off in
`ar.html` with `uiLoading: no; uiScanning: no; uiError: no` because this app has its own
HUD, and because `uiLoading: yes` would print a stray "Loading" label onto the page.

The system also calls `getUserMedia` itself and creates its own `<video>` element, so
`js/scene.js` deliberately does **not** request a camera stream of its own. It only
checks that a secure context and `mediaDevices` exist, then relies on `arError` and a
45 second watchdog for failure.

## Layout

```
index.html        landing page, device checks, marker preview
ar.html           A-Frame scene and MindAR setup
manifest.json     PWA metadata
css/style.css     all styling, including the AR HUD
js/app.js         landing page capability checks
js/scene.js       draw surface component, AR lifecycle, HUD state
assets/card.png   the marker, print this
assets/card.mind  compiled tracking data for that marker
vendor/           pinned third-party libraries
vercel.json       response headers for Vercel
```

## Replacing the marker

`assets/card.mind` was compiled by MindAR from `assets/card.png`. To use your own
artwork, redesign the card keeping it high contrast with a busy border and no repeated
patterns, then compile it at <https://hiukim.github.io/mind-ar-js-doc/tools/compile> and
replace both `assets/card.mind` and `assets/card.png`.

The card must stay 1.812:1 for the current `SURFACE_WIDTH` / `SURFACE_HEIGHT` in
`js/scene.js` to line up. If you change the ratio, update those two constants to match.
