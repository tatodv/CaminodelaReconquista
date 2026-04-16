# Seguimiento de agentes

## 2026-04-16

### Cambios realizados
- Se rediseño `reconquista_v4.html` para priorizar mobile, narrativa scroll-driven y mayor calidad visual general.
- Se incorporaron `Playfair Display` y `Source Sans 3` desde Google Fonts con carga diferida.
- Se rearmo la logica de hitos en un unico `const HITOS_DATA = [...]` para centralizar textos, pins y paneos del mapa.
- Se mejoro el hero con zoom del logo, blur final, desaparicion escalonada del camino en S y sincronizacion del fondo carbon.
- Se rehizo la seccion del camino en S con aparicion centrada, respiracion sutil y texto palabra por palabra.
- Se suavizo la transicion explicacion -> mapa con crossfade del fondo y salida temprana del label.
- Se agrego progreso vertical narrativo, activacion cinematografica de hitos, ripple en pins y dibujo del path con `requestAnimationFrame`.
- Se rehizo el comportamiento mobile del split para mantener mapa sticky de `40vh` y texto debajo.
- Se sumaron microinteracciones de footer, CTA, tooltips de pins y destaque permanente de Spotify.
- Se agrego una via de accesibilidad para `prefers-reduced-motion` que desactiva la experiencia animada y deja el contenido estatico.
- Se agrego `vercel.json` para que la raiz `/` del deploy sirva `reconquista_v4.html` sin renombrar el archivo original.
- Se ajusto la rewrite de Vercel para que respete `cleanUrls` y apunte a `/reconquista_v4` en lugar de `/reconquista_v4.html`.
- Se acorto el primer tramo del hero para que la segunda pantalla aparezca mas rapido en scroll.
- Se aumento y ajusto a dos lineas la bajada del hero: `La revolucion de los chacareros / en el Pago de la Costa y de las Conchas.`
- Se reemplazaron los logos inline del footer del hero por los assets reales `material/logo_sm.svg` y `material/logo_tigre.svg`, corrigiendo el render del logo de Tigre.
- Se rehizo la segunda pantalla con `material/logo-s-camino.svg` para acercarla a la referencia editorial del proyecto.
- Se reemplazo el mapa ilustrado anterior por `material/mapa_CdlR.svg` y se recalibro la narrativa del split con focos reales, zoom/pan y hotspots con tooltip.

### Verificaciones
- Sintaxis del script inline verificada extrayendolo a un archivo temporal y ejecutando `node --check`.

### Pendientes / notas
- Los links de Spotify siguen con `href="#"` porque el archivo original no traia una URL final.
- El repo local no estaba inicializado en esta carpeta; ya quedo conectado al remoto.
