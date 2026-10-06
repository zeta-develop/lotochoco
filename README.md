# lotochoco

## APK con Capacitor + Next.js

Este proyecto empaqueta la UI de Next.js como archivos estáticos en un APK Android. Ventas, caja, resultados y reportes requieren conexión a Supabase. El carrito conserva una venta pendiente para recuperar la misma solicitud tras un fallo de conexión; no admite registrar nuevas ventas sin internet.

### Requisitos

El build genera `out/` y Capacitor lo usa como origen local. Define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` y aplica el esquema indicado en [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### Build local

```bash
npm ci
npm run build
npm run cap:add:android
npm run cap:sync:android
npm run android:build:debug
```

### Build en GitHub Actions

El workflow [android-apk.yml](.github/workflows/android-apk.yml) se ejecuta manualmente, valida el cliente y genera un APK firmado con secretos de CI. La release se crea como borrador. Antes de distribuir, completar [la recuperación de firma](docs/SIGNING-RECOVERY.md).