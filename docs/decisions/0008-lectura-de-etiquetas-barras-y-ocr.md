# ADR 0008 — Lectura de etiquetas: código de barras y número impreso (OCR)

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

En la prueba con el teléfono, el escáner no leía el código de barras de la etiqueta del neumático. Las causas:

- La cámara se abría a la resolución por defecto (640×480), demasiado baja para las barras finas de una etiqueta.
- No se pedía enfoque continuo.
- Si `BarcodeDetector` existía pero no soportaba los formatos, el escáner fallaba en vez de usar el respaldo.
- El respaldo de zxing no probaba a fondo, y su giro de imagen para canvas falla en `@zxing/browser` 0.2.

Además, la etiqueta trae el serial impreso en texto: si las barras están dañadas o sucias, el número igual es legible.

## Decisión

1. **Código de barras.** El escáner pide la cámara en 1920×1080 con enfoque continuo y linterna si el equipo la tiene.
   - Usa `BarcodeDetector` nativo solo si soporta algún formato de la lista.
   - Si no, usa `@zxing/library` directo, con `TRY_HARDER`, sobre el recuadro guía. Prueba la imagen derecha y girada
     90° en lecturas alternadas.
   - Lo que se lee se completa solo (T-L1).
2. **Número impreso (OCR).** `tesseract.js` corre en un worker en paralelo, también sobre el recuadro.
   - Los candidatos se extraen con `serialCandidatesFromText` (en `domain/tires`).
   - Solo se ofrecen si se leyeron igual dos veces seguidas, y **siempre requieren confirmación** ("Usar …", T-L5).
   - Si el candidato se parece a un serial ya registrado del piloto, salvo confusiones típicas (1/I/L, 0/O…), se propone
     ese serial (T-L7).
3. **Archivos del OCR servidos por la propia app** en `ocr/`, mediante un plugin en `vite.config.ts`. Son unos 7 MB y se
   cargan solo al abrir la cámara la primera vez; después quedan en caché. No se usa el CDN por defecto de tesseract.js:
   no se ejecuta código de terceros en tiempo de ejecución (§11.2).

## Alternativas descartadas

- `TextDetector` (Shape Detection API): no está habilitado por defecto en ningún navegador móvil.
- OCR en un servicio externo (Google Vision, etc.): requiere backend, costo por uso y enviar imágenes a terceros.
- Completar el serial leído por OCR sin confirmación: el OCR confunde caracteres. En una fecha de continuación eso
  produce un falso "no coincide", y en una de cambio puede registrar un serial erróneo.

## Consecuencias

- Hay un e2e con cámara simulada en Chromium (`e2e/scanner.spec.ts`) que prueba ambas lecturas sobre la hoja de
  códigos de prueba, que ahora genera etiquetas Code 128 reales con el número impreso.
- La primera apertura de la cámara descarga el OCR, lo que puede tardar con datos móviles en pista. El código de barras
  no espera al OCR.
