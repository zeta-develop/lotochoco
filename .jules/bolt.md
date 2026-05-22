Date: Fri May 22 14:17:24 UTC 2026\nTitle: Capacitor + Supabase Google OAuth\nAprendizaje: When implementing OAuth with Supabase in a Capacitor environment without Ionic React, the manual handling of `Browser` from `@capacitor/browser` combined with `skipBrowserRedirect: true` is required, while keeping the web implementation working via redirect.\nAcción: Used `Capacitor.isNativePlatform()` to conditionally trigger the Android/Web auth flow and set up `App.addListener('appUrlOpen')` to capture deep links with OAuth tokens on native.
Date: Fri May 22 16:03:02 UTC 2026
Title: Requerimientos de Inyección de Env Vars de Next.js en CI
Aprendizaje: When Next.js is configured for static export (`output: 'export'`), it evaluates and inlines variables prefixed with `NEXT_PUBLIC_` at compile time. Therefore, they must be explicitly passed into the `pnpm build` environment within CI scripts (like GitHub Actions) to prevent fallback values or hardcoded defaults from ending up in the static bundle built for Capacitor.
Acción: Recommend injecting secrets.NEXT_PUBLIC_SUPABASE_URL and secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY as environment variables specifically in the 'Build Next.js' step of android-apk.yml.
Date: Fri May 22 16:18:02 UTC 2026
Title: Implementación de Variables en Workflow de CI
Aprendizaje: La estrategia de acotar los secretos únicamente al entorno de ejecución de `pnpm build` en GitHub Actions es la más segura y óptima, pues evita que variables expuestas afecten a plugins nativos, compresión y pasos posteriores de Capacitor y Android.
Acción: Inyectados los secretos NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .github/workflows/android-apk.yml y actualizamos la versión minor en package.json de acuerdo a SemVer.
