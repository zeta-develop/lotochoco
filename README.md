# lotochoco

## APK con Capacitor + Next.js

Este proyecto se empaqueta como APK Android completamente local. La UI se exporta como archivos estáticos y la lógica de datos corre dentro del dispositivo con almacenamiento local; no depende de una URL externa ni de internet en tiempo de ejecución.

### Requisitos

No necesitas definir ninguna URL remota. El build genera `out/` y Capacitor lo usa como origen local.

### Build local

```bash
pnpm install
pnpm build
pnpm cap:add:android
pnpm cap:sync:android
pnpm android:build:debug
```

### Build en GitHub Actions

El workflow [android-apk.yml](.github/workflows/android-apk.yml) genera un APK debug y lo sube como artefacto usando únicamente archivos locales del proyecto.