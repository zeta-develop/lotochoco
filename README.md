# lotochoco

## APK con Capacitor + Next.js

Este proyecto se puede empaquetar como APK Android usando Capacitor sin cambiar la app principal. La app web sigue usando sus rutas API de Next.js y Prisma; por eso, el APK debe abrir una URL desplegada del sitio en lugar de intentar ejecutar todo de forma local dentro del dispositivo.

### Requisitos

Necesitas definir `CAPACITOR_SERVER_URL` con la URL pública donde esté desplegada la app, por ejemplo `https://tu-dominio.com`. Esa URL es la que abrirá el APK y la misma que consumen las llamadas relativas a `/api/...`.

### Build local

```bash
pnpm install
pnpm build
pnpm cap:add:android
pnpm cap:sync:android
pnpm android:build:debug
```

### Build en GitHub Actions

El workflow [android-apk.yml](.github/workflows/android-apk.yml) genera un APK debug y lo sube como artefacto. Puedes dispararlo manualmente con `workflow_dispatch` y pasar `server_url`, o definir la secret `CAPACITOR_SERVER_URL` en el repositorio.