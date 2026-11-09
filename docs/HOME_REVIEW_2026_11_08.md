# Inicio PlayersHype y página del hero

Base: `21c9a08b84263df60c0ad3d1968ce626e4bd4c64`, publicación `pub-2026-11-08T12-58-34-955Z-davjyu`. Se conserva el contenido publicado y el branding aprobado. No se modifica `docs/app/config.json`, el HTML público de análisis, scores, HypePick ni Admin launcher.

## Comportamiento

El hero anterior solo tenía destinos en sus dos botones. Ahora la tarjeta abre una página interna `#destacado`, con imagen, título, cuerpo completo y botones configurados. Volver funciona mediante el enlace y el Back del router nativo; el foco vuelve al hero. El título/cuerpo de página son opcionales y conservan compatibilidad con configuraciones anteriores usando el título/subtítulo publicados. Un CTA hacia la propia página se omite dentro de esa página, y los módulos desactivados se presentan como destinos desactivados.

El Admin añade etiqueta del hero, URL HTTPS de imagen, botón secundario y título/contenido de la página. Los campos actualizan la vista previa y se conservan al publicar. El contrato valida título de página hasta 120 caracteres y cuerpo hasta 6,000; todo se presenta como texto, sin HTML importado.

Inicio añade un resumen de jornada con fecha de Puerto Rico, hipódromos con análisis publicados, conteo exacto y acceso directo al Track Hub. La proyección nativa compacta añade `homeDate`, fecha del track y `publishedRaces`; cuenta IDs publicados una sola vez, excluye borradores y no modifica el objeto fuente. No usa el total de carreras configurado manualmente. Una proyección compacta antigua o de otra fecha no se presenta como jornada actual.

La portada usa un hero menor y tarjetas más compactas. Se conservan el orden/estado de módulos configurado y los destinos existentes. No se crean marcadores multideporte, clima, post times ni estados deportivos ficticios a partir de la referencia visual.

## Implementación y entrega

`apply_home.py` se invoca al final de `apply_sync.py`, sobre una expansión limpia del ZIP retenido. Aplica las fuentes `android-sync/assets/home-page.js` y `.css` en Home y completa el editor del Admin. Los módulos auxiliares no se duplican como dependencias ejecutadas aparte. La compilación CI incorpora la nueva prueba del Home.

`preview_home.py` genera un árbol ignorado para QA. Sustituye el transporte nativo por un JSON local y permite `self` en la CSP solo de la copia HTTP de prueba; la CSP del APK no cambia. Esa preview no demuestra una consulta nativa real ni una instalación.

`export_home_review.py` genera una propuesta HTML autónoma de la publicación actual, con imágenes embebidas, enlaces al Track Hub público, JSON local y hash CSP del único script ejecutable. No es un APK ni un servicio nuevo. El archivo se comprobó en navegador abriendo el hero y regresando al Inicio.

El Home nativo está empaquetado: publicar solamente análisis no instala estos cambios de interfaz. Antes de release hacen falta versión creciente, firma permanente, build y prueba de usuario/Admin en Android. No se generó ni instaló un APK ni se cambió producción.

## Verificación

| Prueba | Evidencia |
| --- | --- |
| Home | 13 comprobaciones DOM: datos de hoy, página, foco/Back, cambios publicados, inyección, proyecciones antiguas, estado live, destinos desactivados, CTA propio y desconexión |
| Admin/publicación | Campos nuevos editados mediante los controles reales; vista previa y paquete publicado conservan foto/título/cuerpo. Ambos destinos, publicaciones individuales, conflicto y recuperación pasan con transporte nativo simulado |
| Proyección y protecciones Java | 27 pruebas JUnit pasan: HomeProjection, AtomicGitPublisher, PublicResults, UrlPolicy e ImportPolicy |
| Alcance Java | ECJ ejecutado sobre las clases reales y JRE 21; API Android del classpath y shim de `AtomicFile` que lanza si se usa. No se ejercita I/O Android, WebView ni ciclo de Activity; no sustituye Gradle/SDK/dispositivo |
| UI existente | 26 comprobaciones DOM correctas |
| Perfil | 8 comprobaciones correctas, 40 perfiles publicados sin modificación |
| Resultados | 9 comprobaciones correctas con fixture de fuente y transporte simulado |
| PDF/JSON | Parser PDF real y regresiones de entradas hostiles correctos |
| Branding | Logo público y variantes originales correctos; Admin launcher permanece igual |
| Navegador | Vista de 390 px: 7 análisis publicados de Camarero del 8 de noviembre; página del hero y regreso funcionan. Exportación autónoma también comprobada |

## Seguridad: 27 controles

| Controles | Aplicabilidad y resultado |
| --- | --- |
| 1, 3, 5, 9, 15, 16, 17, 19 | Se conserva lectura pública y publicación nativa existente; no se añaden cuentas, contraseñas, cookies, pagos ni privilegios. Publicación probada con mocks; autenticación/dispositivo real pendientes |
| 2, 11, 23, 24, 25 | Sin credenciales añadidas. Escaneo por patrones de archivos versionados y archivos comprimidos, con alcance registrado por el comando; no certifica todo el historial ni formatos de secreto desconocidos. Sin rotación |
| 4, 13, 14 | Sin hosts de servicio nuevos; política HTTPS/CSP nativa conservada. Exportación autónoma usa hash CSP. Excepción HTTP solo en QA ignorado |
| 6, 7, 18 | Página limitada por contrato, texto escapado y campos hostiles probados. Proyección nativa solo añade fecha/conteos públicos. Regresión de importación PDF/JSON correcta |
| 8, 12, 20 | Sin telemetría, endpoints de escritura ni intervalos nuevos; se conserva refresh deduplicado. Metadata de release/debug del APK aún pendiente |
| 10 | No se añade SQL |
| 21, 22 | Cero dependencias nuevas de producto. Herramientas Java de QA quedan fuera de repositorio y APK. No se declara una auditoría de todos los avisos de terceros |
| 26, 27 | Pruebas específicas y regresiones anteriores; no es un pentest. Instalación, publicación autenticada y recuperación offline del APK exacto quedan pendientes |

## Rendimiento: 31 puntos

| Puntos | Aplicación |
| --- | --- |
| 1, 2, 15, 29 | Se reutilizan imágenes/fuentes; ilustraciones nuevas no necesarias. Imágenes secundarias conservan lazy/async. Esqueleto de arranque conservado |
| 3, 4, 5, 12, 16 | Cero llamadas nuevas: resumen y página usan la misma configuración compacta. Refresh existente deduplicado. Abrir/cerrar hero no consulta red |
| 6, 9, 10, 27 | No cambian hosting, ETag ni caché. Se evita traer archivos completos de análisis para el resumen |
| 7, 13, 14 | Proyección existente en hilo de recurso nativo; las confirmaciones de publicación siguen dependiendo de verificación. No hay IA ni tareas nuevas en segundo plano |
| 8, 17, 19, 24, 25, 28 | Sin base de datos ni conexiones nuevas. Conteo local de carreras publicadas; archivo de análisis completo no sale hacia Home |
| 11, 20, 21, 22, 23, 26 | Home JS + HTML: 51,531 → 60,867 bytes sin comprimir (+9,336). Sin runtime nuevo, vídeos automáticos ni bucles de animación; se conserva reduced-motion |
| 18, 30, 31 | Arranque/render, refresh y desconexión probados en DOM; vista móvil en navegador. No hay medición de arranque frío/caché/red lenta del APK ni telemetría añadida |

La revisión previa del perfil/checklist se mantiene separada; esta propuesta cambia el Inicio y su editor.
