# Despliegue del 6 de octubre de 2026

La migración de seguridad se aplicó a Supabase desde la VPS PrestaFacil por SSH/Tailscale, utilizando su conectividad IPv6. La zona confirmada es `America/Managua` para las tres empresas existentes.

Antes de aplicar se generaron respaldos cifrados, se restauró el respaldo real en PostgreSQL local y se probaron la migración, las regresiones de aislamiento/contabilidad y las operaciones concurrentes. Se tomó un respaldo reciente adicional justo antes del cambio real.

## Datos conservados

Permanecen 1.133 tickets, 14.592 jugadas, 259 resultados y 169 premios. Una comprobación dentro de la transacción verificó la conservación de importes de tickets/jugadas/premios, pagos, saldos de caja, movimientos, números ganadores y membresías. Se convirtieron los importes a decimales de dos posiciones conforme a la migración.

- La configuración de juegos compartida entre empresas se copió por empresa, junto con sus horarios. Se actualizaron las referencias afectadas; no se reasignaron tickets ni importes a otra empresa.
- Se archivaron cuatro copias idénticas de resultados procesados que no tenían premios asociados. Las filas permanecen en la base; sus originales se registraron en `pos_private.legacy_repair_audit`.
- Un movimiento de caja de 2 unidades apuntaba a una sesión de otra empresa. Conserva su empresa, tipo e importe. Su asociación inválida quedó nula y el vínculo original está en la auditoría privada para conciliación por el operador. No se inventó una caja ni se recalcularon saldos históricos.
- Las comprobaciones posteriores encontraron cero referencias cruzadas entre empresas en jugadas/juegos, resultados/juegos y movimientos/caja.

Los respaldos cifrados se conservan fuera del repositorio, en `/root/lotochoco-replacement-signing`, y en el directorio privado de migración de la VPS. No versionar los respaldos, contraseñas ni filas del registro de auditoría. No volver a ejecutar esta migración sobre la base ya migrada.

## Cliente 1.8.8

El comprobante para compartir usa HTML independiente del visor térmico y exporta PNG a 1200 píxeles de ancho. Conserva ceros iniciales, muestra el premio como potencial, distingue vistas previas y boletos anulados, y utiliza la hora de Nicaragua. Se probó una imagen de 16 jugadas con un visor de 390 píxeles sin recorte horizontal.

El workflow permite publicar un prerelease mediante `publish=true`, conserva borradores por defecto y verifica la firma del APK con `apksigner`. El APK utiliza la identidad de reemplazo y requiere verificar la transición desde la firma anterior. Continúa pendiente la validación física de instalación, OAuth e impresora.
