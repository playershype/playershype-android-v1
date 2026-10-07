# PLAYERSHYPE V0.1 — SECOND BRAIN / HANDOFF
Actualizado: 2026-10-07
Repositorio: playershype/playershype-android-v1
Rama exclusiva: v0.1-stitch-clean
Regla: NO modificar ni fusionar main. NO regresar a V1/V1.3.x. NO asumir que build verde implica funcionalidad.

## Objetivo
Aplicación Android User + Admin de PlayersHype; HypePredict con Track Hub, selector de fecha, jornadas, análisis por carrera, mantillas y uniformes, pace, Tale of the Tape, retiros, HypeBoard y Postmortem. Publicación Live mediante GitHub Pages/config remoto.

## Fuente de verdad del Postmortem
Archivo aportado por el usuario: HUB.html (referencia de diseño y lógica, NO aplicación a desplegar). Postmortem debe respetar el formato visual y operativo de HUB.html: JSON / TEXTO / MANUAL, posiciones completas, agregar/quitar posición, notas, guardar, guardar y siguiente, historial, métricas con información disponible. Registro manual dentro del Admin APK, nunca exclusivamente en HUB.html. Análisis prerace inmutables; resultados en capa separada.

## Trabajo confirmado en GitHub
1. docs/hypepredict/index.html: corrección de filtro global de fechas y pistas con análisis; la función day no debe sustituir una fecha faltante por la jornada más reciente. Commit anterior 33b9474e3520fe23365e3d38c06602386a604542 (posteriormente hay commits en la rama).
2. admin-app/app/src/main/assets/admin-shell.js: Postmortem Admin extendido con los tres modos JSON, TEXTO y MANUAL, orden completo de llegada, validación de posiciones, controles agregar/quitar, notas, dividendo opcional, guardar y siguiente, exportación JSON e historial local. Commit 880bfc95cb882d6bbddb4120fb33102dbba45fa5.
3. La clave de almacenamiento local sigue siendo playershype:postmortem:v1:results. El formato conserva winner, second, third para compatibilidad y agrega order para posiciones completas. Importación JSON admite resultados[] y arreglos; texto usa FECHA | PISTA | R# | #,#,#.
4. La entrada manual NO publica automáticamente resultados a Live; hay que implementar/validar puente seguro de publicación y lectura pública. No declarar terminada esa integración.

## Ubicación del código
- admin-app/app/src/main/assets/admin-shell.js: módulos del Admin y Postmortem.
- admin-app/app/src/main/assets/admin.html: contenedor de Admin.
- admin-app/app/src/main/assets/admin-publisher.js: publicación Admin.
- admin-app/app/src/main/assets/trackhub-manager.js: administración Track Hub.
- app/src/main/assets/predict-dashboard.js y predict-dashboard.css: experiencia User.
- docs/hypepredict/index.html: portal público.
- docs/app/config.json: datos publicados; NO sobrescribir historial.
- .github/workflows/: compilación y publicación.

## Reglas funcionales no negociables
- Seleccionar fecha debe mostrar únicamente análisis de esa fecha y TODOS los hipódromos con análisis ese día; seleccionar hipódromo cambia de verdad el contenido, nunca se arrastra el análisis anterior.
- Mostrar jornada completa y retiros correctos por jornada/carrera; nunca inventar scratches.
- Mantillas US exactas; sedas conforme al texto del uniforme, con fallback si faltan.
- Proyección de llegada/Pace Projection, HypeBoard y Tale of the Tape deben ser funcionales y móviles.
- Resultados del Postmortem no modifican HypeScore, pronósticos, Selects ni contenido prerace.

## Pendiente de verificar / ejecutar (no declarar resuelto)
- Paridad visual exacta del Postmortem con HUB.html: estilos, estadísticas, gráficos y controles adicionales. La implementación del Admin actual cubre flujos de entrada pero NO copia íntegramente el layout ni motor estadístico de HUB.html.
- Integrar resultados Postmortem con publicación Live, almacenamiento histórico persistente y visualización pública read-only; evitar pérdida de historial al actualizar config.
- Verificar que GitHub Pages sirve realmente la rama y ruta actualizadas, y que el selector global funciona con config.json real e histórico multifecha.
- Probar manual/JSON/texto en APK físico, persistencia tras reinicio, errores de validación, import/export y navegación.
- Revisar build GitHub Actions del commit 880bfc95c y descargar/probar APK; cuando se creó este handoff, el workflow estaba in_progress.
- Revisar uniformes, scratches, weather, pace, Tale of the Tape, date/track selectors y publicación con pruebas reales. No asumir resueltos por compilación.

## Protocolo de aceptación
1. Sin tocar main, confirmar rama, SHA, fuente de GitHub Pages y workflow verde.
2. Mismo día con dos pistas: aparecen ambas y cambian carreras/análisis; fecha sin datos no muestra datos de otra.
3. Postmortem: introducir R1 con 5+ posiciones, guardar, reiniciar, editar, exportar, importar, conservar el orden.
4. Confirmar pronósticos previos intactos, historial por pista/fecha y cero retiros falsos.
5. Validar APK Admin y User en Android real; publicar solo tras prueba.

## Advertencias
No confundir HUB.html de 5 MB con el Admin APK; sirve como especificación. Los resultados almacenados en localStorage de Admin no son resultados publicados. No presentar cambios de GitHub como APK ya probado.
