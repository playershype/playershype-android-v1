# PlayersHype: revisión de experiencia del ejemplar

Base: `e592ff88850a9025ac508a11a2bba6c8b435a2c8`, publicación del 7 de noviembre de 2026. El App conserva su sobre original `pub-2026-11-07T13-29-32-218Z-82x8qv`; el Dashboard conserva su configuración `pub-2026-11-07T13-29-57-098Z-1hji4pu`. No se modifica `config.json`.

## Cambios

- Quick Hits abre el perfil del ejemplar pulsado y devuelve el foco al cerrar.
- El checklist muestra tarjetas desplegables, búsqueda por número/nombre y marcas personales de revisión. El contador cubre todo el campo, aunque la búsqueda oculte filas. Las marcas son de esta sesión/publicación; no evalúan factores ni cambian el análisis.
- El perfil separa Resumen, Forma, Briseos y Lectura mediante pestañas accesibles. La lectura se conserva íntegra. Los briseos aprovechan el ancho disponible y conservan su orden.
- Uniformes vectoriales: Kikito conserva verde y diamante naranja en frente/espalda. Las mangas sin detalle representado quedan grises, con explicación visible. Otros diseños se identifican como parciales o pendientes; no se inventan logos, gorras ni disposición de colores. El color de la manta nunca determina el uniforme.
- `co_base` y `["co-base"]` se presentan como `Co-base`; el dato fuente permanece intacto. Un gap publicado de cero conserva el cero.

La fuente compartida es `android-sync/assets/experience.js` / `.css`. `apply_experience.py` actualiza ambos HTML y es idempotente. `apply_sync.py` usa la misma transformación para el lector nativo y el exportador del Admin. La publicación desde un Admin antiguo aún puede usar su plantilla antigua: esta propuesta requiere entregar y verificar el Admin actualizado antes de considerarla una actualización permanente del teléfono.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| Perfiles publicados, campos, lectura y texto hostil | 8 comprobaciones DOM correctas, 40 perfiles del 5 de noviembre |
| Pestañas, teclado, Quick Hits, uniformes, búsqueda, marcas, foco y ceros | 12 comprobaciones correctas con la publicación del 7 de noviembre |
| Resultados, fechas, caché y retorno a pestaña | 9 comprobaciones correctas; transporte simulado con fixture real |
| Sincronización y publicación Admin | Pasan escenarios de ambos destinos, publicación individual, conflicto, desconexión y conservación del borrador |
| Alcance de publicación | 5 comprobaciones correctas |
| UI pública/Admin existente y CSP de exportaciones | 26 comprobaciones DOM correctas |
| Importación PDF/JSON y entradas hostiles | Regresión con el parser PDF real correcta |
| Branding | Logo público correcto y launcher Admin sin cambios |
| Código empaquetado | Lector nativo y exportador generados desde una expansión limpia contienen exactamente el mismo módulo de experiencia |
| Navegador | App independiente con sobre comprimido verificado; perfil, pestañas, lectura, checklist y marca 1/5 comprobados en vista móvil |
| Integridad | Sobre del App idéntico byte por byte; configuración, scores, lecturas y jugadas sin cambios |

No se compiló ni instaló un APK. No hay `javac` ni `adb` disponibles; las pruebas JUnit nativas y los recorridos de dispositivo quedan pendientes. Las pruebas de publicación usan mocks; no se afirmó una escritura autenticada de análisis desde un teléfono.

## Seguridad: aplicabilidad de los 27 controles

| Controles | Alcance y evidencia |
| --- | --- |
| 1, 3, 5, 9, 15, 16, 17, 19 | Esta superficie sigue siendo lectura pública; no añade cuentas, cookies ni pagos. La autorización nativa existente no cambia. Publicación y conflictos cubiertos por regresiones; verificación autenticada en dispositivo pendiente. |
| 2, 11, 23, 24, 25 | No se añaden credenciales. Escaneo de patrones sobre archivos versionados y cinco archivos comprimidos sin hallazgos; no constituye examen completo de historial ni de formatos desconocidos. No hubo rotación. |
| 4, 13, 14 | Sin hosts ni endpoints nuevos. El empaquetado conserva CSP y cabeceras nativas existentes, verificadas por la regresión de seguridad. No se atribuyen cabeceras nativas al hosting GitHub Pages. |
| 6, 7, 18 | Los nuevos campos se escapan según contexto. SVG usa colores internos, sin HTML importado, imágenes remotas ni ejecución. Pruebas hostiles de nombres, campos, uniformes y lectura correctas; regresión real PDF/JSON correcta. |
| 8, 12, 20 | Sin telemetría ni endpoints nuevos. Marcas limitadas a 300 claves en memoria; sin escrituras de servidor. Verificación de release/debug en APK pendiente. |
| 10 | No se incorpora SQL. |
| 21, 22 | Sin dependencias nuevas de producto. Ilustraciones generadas localmente. Parser PDF existente conservado y ejercitado; no se afirma una auditoría nueva de todos los avisos de terceros. |
| 26, 27 | Alcance: cambios de presentación y regresiones del empaquetado. Comprobaciones estáticas, DOM y navegador; no es un pentest ni una entrega Android instalada. |

## Rendimiento: aplicabilidad de los 31 puntos

| Puntos | Evidencia y límites |
| --- | --- |
| 1, 2, 15, 29 | SVG local, fuentes existentes, sin descargas de imágenes ni cambios de fuentes. |
| 3, 4, 5, 12, 16 | Las interacciones nuevas generan cero peticiones. Búsqueda local y marcas en memoria; se conserva sincronización y recuperación sin conexión. |
| 6, 9, 10, 27 | Sobre, configuración y política de caché existentes conservados. El nuevo flujo no depende de un servicio de generación de imágenes. |
| 7, 13, 14 | No hay tareas remotas ni falsa confirmación de publicación. Las marcas son acciones personales reversibles. |
| 8, 17, 19, 24, 25, 28 | No se añaden base de datos, consultas ni conexiones. |
| 11, 20, 21, 22, 23, 26 | Sin paquetes nuevos; pestañas ocultan paneles y tarjetas mantienen detalle plegado. Cada HTML aumenta aproximadamente 17.3 KB sin comprimir. |
| 18, 30, 31 | Microbenchmark orientativo del perfil en jsdom: antes 0.056 ms/apertura, después ~0.08–0.11 ms/apertura. No representa latencia Android. La vista móvil se comprobó en navegador; arranque frío/caché/red lenta y recuperación del APK exacto siguen pendientes. Sin telemetría añadida. |

## Entrega

Propuesta en rama y PR de revisión, sin publicar en producción. `docs/experience-preview.html` permite explorar una vista móvil cuando se sirve el árbol `docs`. Antes de release: CI nativo completo, build con firma permanente y versión creciente, instalación y prueba del APK exacto (usuario/Admin), y comprobar que una publicación nueva del Admin conserva estas pantallas.
