# Scrollytelling Implementation

## Overview
The new experience lives in `recorrido.html`, which resolves to `/recorrido` in production because the project already uses Vercel `cleanUrls`.

The production Vercel project serves `public/` as its output directory, so deployable copies also live under:
- `public/index.html`
- `public/recorrido.html`
- `public/styles/recorrido.css`
- `public/scripts/recorrido/`

Routes:
- `/` rewrites to the premium scrollytelling experience
- `/recorrido` is the clean URL for the new page
- `/reconquista_v4` remains available as the previous landing

## Architecture
Because the repository is a static Vercel site, the implementation uses modular static assets instead of introducing a framework or build system.

Main entry points:
- `recorrido.html`
- `styles/recorrido.css`
- `scripts/recorrido/app.js`
- `scripts/recorrido/data.js`
- `scripts/recorrido/map.js`
- `scripts/recorrido/audio.js`

## Components And Responsibilities

### Page shell
`recorrido.html`
- Defines the first-screen editorial scrollytelling stage
- Hosts the mobile bottom sheet
- Hosts the timeline drawer and overview section
- Exposes a shared `<audio>` element for the custom player

### Styling system
`styles/recorrido.css`
- Editorial/paper visual system
- Desktop museum-style split layout inspired by the reference mockups: left narrative rail, right map stage, bottom route/audio console
- Mobile map-first layout with compact bottom controls, large tap targets, and timeline drawer access from the top-right menu
- Map overlays, audio panel, timeline drawer, and section cards
- Active marker pulse styling for MapLibre

### Data normalization
`scripts/recorrido/data.js`
- Loads:
  - `/public/data/points.geojson`
  - `/public/data/route.geojson`
  - `/public/data/podcast.json`
- Normalizes points into a UI-friendly structure
- Creates fallback illustration paths from the existing SVG assets
- Builds the point GeoJSON used by MapLibre

### Map controller
`scripts/recorrido/map.js`
- Boots MapLibre with a muted raster OpenStreetMap base
- Adds:
  - base route line
  - animated progress route line
  - point layers
  - active pulse marker
- Calculates per-point camera framing from adjacent coordinates
- Handles route reveal progress and active-point camera transitions

### Audio controller
`scripts/recorrido/audio.js`
- Manages the shared HTML audio element
- Tracks:
  - active point
  - current time
  - duration
  - loading/play/pause/error state
- Exposes toggle and seek methods for both desktop and mobile controls

### Scrollytelling orchestration
`scripts/recorrido/app.js`
- Renders the story sections from normalized data
- Renders the overview cards and timeline drawer
- Syncs:
  - active chapter
  - sticky map UI
  - mobile sheet content
  - audio panel state
- Uses GSAP + ScrollTrigger for scroll-linked progression

## Animation Logic

### Narrative progression
Each `.story-step` gets a ScrollTrigger.

When a step crosses the active zone:
- the chapter card becomes active
- the sticky map camera eases to the corresponding point
- the map overlays update title, place, count, and action links
- the audio controller swaps to the active point metadata

### Route reveal
A second ScrollTrigger tracks the overall progress of `#experience-shell`.

That progress value drives:
- the desktop route meter bar
- the MapLibre `line-gradient` for the orange route reveal
- the completed-point layer filter

### Entrance motion
The summary sections use lightweight GSAP entrance animations.
If the user prefers reduced motion, CSS disables the long animation timings.

## Data Flow

1. `data.js` fetches GeoJSON + podcast metadata.
2. Points are normalized into a single array with:
   - narrative copy
   - map coordinates
   - image paths
   - audio metadata
   - Google Maps deep links
3. `app.js` renders all story UI from that normalized array.
4. `map.js` receives the same normalized points plus the route feature.
5. `audio.js` receives the active point metadata whenever the chapter changes.

This keeps the page fully data-driven and avoids duplicated hardcoded route content in the UI layer.

## Content Updates Later

### Update points
Edit `public/data/points.geojson`.

Relevant fields used by the page:
- `order`
- `title`
- `place`
- `municipality`
- `description`
- `image`
- `audio`

### Update route geometry
Replace `public/data/route.geojson` with the final LineString.

No UI code changes are needed as long as:
- the file stays a GeoJSON FeatureCollection
- one feature contains a `LineString`

### Update podcast/audio
Edit `public/data/podcast.json` and add audio files under:
- `public/audio/`

To enable a point audio:
1. Drop the file into `public/audio/`
2. Update the matching item in `podcast.json`
3. Set `available` to `true`
4. Optionally set `duration`

In production, Vercel serves `public/audio/` at `/audio/`, so JSON paths should use `/audio/file-name.mp3`.

### Update illustrations or photography
The current implementation uses the available SVG point illustrations.

To replace them with final images:
1. Add the new asset
2. Update the `image` field in `points.geojson`

## Dependencies
No package-manager dependencies were added.

Pinned CDN dependencies used by the new route:
- `gsap@3.12.5`
- `maplibre-gl@4.7.1`

Why:
- keeps the current static architecture intact
- avoids introducing a build pipeline into a repo that does not currently use one
- keeps the feature easy to deploy on the existing Vercel setup

## Notes About Current Assets
Current repo state required a graceful fallback strategy:
- `points.geojson` had placeholder descriptions, so it was updated with usable copy
- the repository contains SVG point illustrations but not the referenced JPG files
- audio files are not present yet, so `podcast.json` is initialized with `available: false`

The UI is ready for final media assets without structural changes.
