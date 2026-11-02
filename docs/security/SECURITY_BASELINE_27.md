# 27 controles y aplicabilidad

Origin: user's supplied video 75307.mp4, received 2026-11-02. Treat this as the user's requested baseline, not as evidence that any application already implements it.

| # | Control | Aplicar y verificar |
|---|---|---|
| 1 | Autenticación | Usar un proveedor mantenido o una implementación probada cuando haya cuentas. Probar fallos, expiración y acceso sin autenticar. |
| 2 | Secretos fuera del navegador | Guardar secretos de servicio en el servidor. Mantener credenciales personales nativas cifradas y fuera de exports, DOM persistente y almacenamiento web. |
| 3 | Protección de datos | Denegar acceso por defecto a datos privados; aplicar permisos por identidad y objeto. Para datos públicos, documentar su carácter público. |
| 4 | HTTPS | Deshabilitar tráfico claro, contenido mixto y aceptación de certificados inválidos. |
| 5 | Contraseñas con hash | Utilizar un proveedor de autenticación o un KDF adecuado, como Argon2id. No almacenar contraseñas reversibles. No aplicar hash a un token que deba recuperarse para llamar a una API. |
| 6 | Validación privilegiada | Validar en servidor/capa nativa y limitar recursos; la validación de interfaz es adicional. |
| 7 | XSS | Escapar según contexto, limitar contenido activo, aplicar CSP y deshabilitar scripts de documentos importados. |
| 8 | Actividad sospechosa | Registrar eventos mínimos útiles sin secretos ni datos innecesarios; diferenciar registro local de monitoreo central activo. |
| 9 | Rutas de administración | Autorizar cada operación privilegiada, incluso si se invoca directamente sin la interfaz. |
| 10 | Consultas parametrizadas | Usarlas si existe SQL; no concatenar entradas. Marcar no aplicable cuando no exista base SQL. |
| 11 | Variables de entorno | Separar entornos y secretos; no publicar archivos .env ni incluir variables privadas en bundles. |
| 12 | Límites de peticiones | Aplicar en el backend adecuado y limitar concurrencia/cargas en el cliente sin romper el uso normal. |
| 13 | CORS | Restringir orígenes cuando exista API web propia. No usar CORS como autenticación ni como protección de un API nativo. |
| 14 | Cabeceras | Aplicar CSP, nosniff, política de referencia y protección contra framing donde el hosting o la capa nativa lo permita. No afirmar que un archivo _headers configura un proveedor que no lo soporta. |
| 15 | Cookies de sesión | Cuando se usen, aplicar Secure, HttpOnly y SameSite, con expiración y revocación. |
| 16 | CSRF | Proteger operaciones que autentiquen mediante cookies; documentar otros modelos de credenciales sin inventar una sesión web. |
| 17 | Recuperación de acceso | Usar tokens de un solo uso con caducidad cuando exista recuperación de cuentas. |
| 18 | Subidas e importaciones | Limitar tipo, contenido, tamaño individual/total, rutas, conteo, descompresión y ejecución. |
| 19 | Precios y pagos | Verificar importes, moneda, permisos y webhooks en servidor, con idempotencia cuando haya cobros. |
| 20 | Producción sin debug | Deshabilitar debug, errores detallados y endpoints de desarrollo; mantener diagnósticos sanitizados útiles. |
| 21 | Dependencias vulnerables | Examinar versiones reales, transitorias y vendorizadas; verificar avisos oficiales, actualizar y probar compatibilidad. |
| 22 | Paquetes innecesarios | Retirarlos de la superficie que no los usa; no confundir herramientas de pruebas con dependencias enviadas al usuario. |
| 23 | Archivos expuestos | Revisar directorio público y artefactos por backups, fuentes privadas, mapas, dumps y configuraciones sensibles. |
| 24 | Secretos en historial | Revisar historial accesible y archivos comprimidos relevantes sin reproducir valores encontrados. |
| 25 | Claves comprometidas | Revocar/rotar únicamente tras confirmar exposición y dentro de la autorización disponible; verificar servicios dependientes. |
| 26 | Revisión integral | Delimitar la cobertura real y las fronteras de confianza. No presentar un chequeo estático como pentest completo. |
| 27 | Pruebas e informe | Probar controles negativos y recorridos normales; entregar hallazgos, arreglos, evidencia y pendientes concretos. |

## Referencias primarias

- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges
- https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion
- https://github.com/mozilla/pdf.js/security/advisories

Consultar avisos actuales al elegir versiones; no conservar una lista congelada de versiones supuestamente seguras.
