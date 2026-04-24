# Changelog

## 2026-04-24 — Mejoras de UX/UI, responsive y accesibilidad

Sesion de fixes sobre la pagina `/recorrido` (scrollytelling del Camino de la Reconquista) y el hero. Todos los cambios estan sincronizados entre `public/` (fuente servida por Vercel) y las copias de raiz (`styles/`, `scripts/`, `recorrido.html`).

### Mapa editorial

- **Quitados los nombres de los puntos** que se renderizaban encima del mapa SVG dinamico. Se superponian con las etiquetas ya dibujadas en `public/material/mapa_sinpuntos.svg`.
- **Snapshot mobile recortado** con viewBox propio `320 36 780 980` (antes usaba el viewBox completo `0 0 1920 1080`), para que el recorrido entre en pantalla sin achicarse ni cortarse.
- `map.js` ahora expone `createMapSnapshotMarkup()` (version estatica sin controles ni dots, con el progress del recorrido dibujado).
- Camara desktop mas suave: `baseScale` 1.34 -> 1.08, pulls acotados a ±4.4/±6.2%.
- Base del mapa apunta a `/material/mapa_sinpuntos.svg`.

### Story-cards (desktop)

- **Titulos balanceados**: `text-wrap: balance` + `max-width: 22ch` para eliminar el articulo suelto en primera linea ("El", "La", "Los" en renglon propio).
- Tipografia del titulo mas equilibrada en columnas angostas: `clamp(1.85rem, 2.2vw, 2.9rem)` (antes `clamp(2.35rem, 3.7vw, 4.05rem)`).
- **Ilustraciones mas grandes**: `max-height: min(72vh, 640px)` (antes 58vh/560px).
- Grid rebalanceado: `minmax(260px, 1fr) minmax(340px, 1.5fr)` con `max-width: 1040px` — la ilustracion recibe mas espacio que el copy.
- `.experience-shell` pasa de grid `42%/58%` a **`50%/50%`**, dando mas aire a la story-column sin comprimir el mapa.
- Breakpoints intermedios (900-1280, 1281-1600) ajustados para que la grilla no rompa con tipografia grande y columna angosta.

### Accesibilidad (WCAG AA)

- **Foco visible global**: `:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px }` aplicado a todos los controles interactivos. Antes dependia del default del navegador y varias reglas lo tapaban.
- **Touch targets a 44px minimo** (antes 34-42px): botones ghost, hero, chapter, podcast, chapter-chip, socials del hero, `#timeline-open`, chapter-button/link en mobile.
- **Contraste de texto mejorado**:
  - `.story-step` inactivo: opacity `0.46` -> **`0.68`** (contraste efectivo ~6:1 sobre fondo beige).
  - `--ink-muted`: alpha `0.55` -> **`0.7`**.
  - Socials en hero: `rgba(62,59,57,0.46)` -> **`0.72`**.
- **Imagenes con `width` y `height` explicitos** (`1536x1024`) — elimina CLS garantizado al cargar ilustraciones.
- `@media (prefers-reduced-motion: reduce)` ya existia, se mantiene.

### Consistencia visual

- Nuevos tokens en `:root`: `--paper-warm` (#fbf6ef), `--paper-bright` (#fff8ef), `--map-bg` (#bdb6ac).
- 8 ocurrencias de colores `#hex` hardcoded reemplazadas por tokens.

### Limpieza de codigo

- Removido el pipeline de fallback PNG/SVG del JS (`applyImageFallbacks`, `getIllustrationFallback`, `getRasterFallback`, `getLegacyPublicFallback`) — el sitio servia AVIF unico y los fallbacks apuntaban a archivos inexistentes. AVIF tiene >97% de soporte global desde 2022.
- Eliminado `data-fallback-src` de los `<img>` (story-card + mobile-sheet).
- Removida regla CSS huerfana `.story-mobile-map .story-map__point-label { display: none }` (el label ya no se renderiza).

### Infraestructura

- Agregado `.gitignore` para `.claude/`, screenshots de debug (`material/_*.png`) y `SEGUIMIENTO_AGENTES.md`.

### Puntaje estimado (agente ui-reviewer)

| Categoria | Antes | Despues |
|---|---|---|
| Responsiveness | 8.5 | 8.5 |
| Accessibility | 5.5 | ~8.5 |
| Visual consistency | 8 | ~9 |
| Performance (CLS) | 6.5 | ~7.5 |
| **Global** | **7.2** | **~8.5** |

### Pendientes conocidos (no cubiertos en esta sesion)

- Falta skip-link (`<a class="skip-link" href="#main">`) para keyboard users.
- Controles del mapa (`<span>+</span><span>-</span>`) no son botones, no focusables por keyboard.
- No hay breakpoint dedicado a tablet (~768-1024) — el rango 900-1280 apila en 1 columna y desperdicia ancho.
- SVG `feGaussianBlur` en `routeGlow` es costoso durante animaciones del progress.
