Date: Fri May 22 14:17:24 UTC 2026\nTitle: Capacitor + Supabase Google OAuth\nAprendizaje: When implementing OAuth with Supabase in a Capacitor environment without Ionic React, the manual handling of `Browser` from `@capacitor/browser` combined with `skipBrowserRedirect: true` is required, while keeping the web implementation working via redirect.\nAcción: Used `Capacitor.isNativePlatform()` to conditionally trigger the Android/Web auth flow and set up `App.addListener('appUrlOpen')` to capture deep links with OAuth tokens on native.
Date: Fri May 22 16:03:02 UTC 2026
Title: Requerimientos de Inyección de Env Vars de Next.js en CI
Aprendizaje: When Next.js is configured for static export (`output: 'export'`), it evaluates and inlines variables prefixed with `NEXT_PUBLIC_` at compile time. Therefore, they must be explicitly passed into the `pnpm build` environment within CI scripts (like GitHub Actions) to prevent fallback values or hardcoded defaults from ending up in the static bundle built for Capacitor.
Acción: Recommend injecting secrets.NEXT_PUBLIC_SUPABASE_URL and secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY as environment variables specifically in the 'Build Next.js' step of android-apk.yml.
Date: Fri May 22 16:18:02 UTC 2026
Title: Implementación de Variables en Workflow de CI
Aprendizaje: La estrategia de acotar los secretos únicamente al entorno de ejecución de `pnpm build` en GitHub Actions es la más segura y óptima, pues evita que variables expuestas afecten a plugins nativos, compresión y pasos posteriores de Capacitor y Android.
Acción: Inyectados los secretos NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .github/workflows/android-apk.yml y actualizamos la versión minor en package.json de acuerdo a SemVer.

### 2024-05-23
- **Title:** Bloquear build si faltan credenciales de Supabase
- **Aprendizaje:** Si las variables de Supabase no están correctamente inyectadas desde los secretos de GitHub (por error de nombre o por usar variables en lugar de secretos), Next.js compilaba usando los fallbacks, lo que resultaba en un APK inútil que apuntaba a `placeholder-url.supabase.co`.
- **Acción:** Se ha modificado `lib/supabase/client.ts` para que elimine el fallback e introduzca un `throw new Error()` en caso de que falten `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`. De esta forma, el proceso de compilación `pnpm build` en GitHub Actions fallará de manera explícita y preventiva.

## 2024-05-22: Error de Secretos de GitHub en Construcción Next.js
**Aprendizaje**: En GitHub Actions, si un secreto se añade bajo "Environment secrets" en lugar de "Repository secrets", el trabajo no tendrá acceso a él a menos que el paso / job especifique explícitamente `environment: nombre_del_entorno`. Esto hace que Next.js detecte la variable de entorno como indefinida durante el paso de construcción, resultando en errores si el código requiere esas variables (`lib/supabase/client.ts` con fail-fast en Supabase).
**Acción**: Se añadieron comprobaciones "pre-flight" en la workflow `android-apk.yml` de GitHub Actions para verificar explícitamente y mostrar mensajes de ayuda detallados si falta una variable de entorno de construcción, además de enriquecer el mensaje de error de compilación de Supabase Client en Next.js.

### 2024-05-23
- **Title:** Corrección de flujo OAuth (Google) con Capacitor y Supabase v2 (PKCE)
- **Aprendizaje:** Supabase v2 utiliza por defecto el flujo PKCE para OAuth, devolviendo la respuesta (redirección deep link) con un parámetro `code` en la cadena de consulta (query string) en lugar de utilizar tokens directos en el fragmento (hash). El listener `appUrlOpen` original sólo buscaba en el hash, lo que resultaba en fallos de inicio de sesión que dejaban la UI en espera indefinida.
- **Acción:** Se actualizó `auth-provider.tsx` para detectar el parámetro `code` mediante `url.searchParams.get('code')` y utilizar `supabase.auth.exchangeCodeForSession(code)` en su lugar para completar el flujo OAuth en Capacitor. Se mantuvo como fallback el manejo de `hash` por retrocompatibilidad.
