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

### Verificaciones
- Sintaxis del script inline verificada extrayendolo a un archivo temporal y ejecutando `node --check`.

### Pendientes / notas
- Los links de Spotify siguen con `href="#"` porque el archivo original no traia una URL final.
- El repo local no estaba inicializado en esta carpeta; se deja preparado para conectarlo al remoto.
