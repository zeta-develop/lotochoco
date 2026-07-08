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
\n### 2026-05-22\n- **Title:** Implementación Offline First con Supabase y SQLite\n- **Aprendizaje:** La adición de la sincronización incremental requiere columnas de rastreo (`isDirty`, `deletedAt`) y una tabla de estado global (`SyncState`) para gestionar el pull/push contra la fuente de verdad (Supabase), permitiendo retener las lecturas SQLite como O(1) y garantizando operación sin bloqueo de red.\n- **Acción:** Se diseñó el `SyncManager` en `services/sync` que evalúa recursivamente los `updatedAt` desde Supabase, permitiendo resolución conservadora (Server Wins) para la arquitectura de la aplicación.

### 2024-05-23
- **Title:** Correcciones Avanzadas de Sincronización Incremental (SyncState, Transacciones, Timeout)
- **Aprendizaje:** Al implementar sistemas offline-first de sincronización manual con SQLite, es fundamental normalizar la captura de errores `Error` (evitando outputs como `[object Object]`), asegurar la protección concurrente (mutexes, timeout en caso de caída) e inicializar proactivamente estructuras del modelo que puedan estar vacías, como `SyncState`. Además, hay que garantizar transaccionalidad mediante `BEGIN TRANSACTION` durante escrituras de red a local.
- **Acción:** Se auditó y corrigió el motor `SyncManager`, se agregaron transacciones locales, inicialización segura de lectura para `SyncState`, y un envoltorio para evitar re-subidas accidentales (default `isDirty=0` en migraciones históricas, `1` en nuevas inserciones).

## 2024-05-23 - Solución Error 42501 RLS y Ciclo Sincronización
- **Aprendizaje:** La sincronización de Supabase con `upsert()` fallaba constantemente por un error 42501 (RLS Policy Violation) en la tabla `companies`. Se determinó que el script de migración SQL no contenía políticas para `UPDATE` tanto en `companies` como en `company_users`. Además, los registros locales nunca avanzaban su estado (isDirty) y se bloqueaban en 1970 porque el motor genérico no estaba reseteando la bandera tras un PUSH exitoso.
- **Acción:** Se añadieron las políticas `UPDATE` a `supabase_schema.sql`. En el motor de sincronización (`services/sync/sync-config.ts`), se implementó explícitamente el update `isDirty = 0` hacia SQLite post-push y se manejaron de forma aislada los errores dentro de cada tabla iterada en `services/sync/sync-manager.ts`. Se recomienda aplicar esto ante futuras tablas nuevas que se integren al ecosistema.

### 2024-05-23
- **Title:** Corrección Sincronización Inicial - RLS y Trigger Companies
- **Aprendizaje:** El ciclo de sincronización fallaba (error 42501) al crear una compañía porque la consulta .select() en el insert fallaba dado que el usuario aún no era miembro de dicha compañía. Además, al insertar la compañía se intentaba agregar el usuario a company_users *después* del retorno de la compañía.
- **Acción:** Se agregó `WITH CHECK` a las políticas RLS. Además, se implementó un trigger AFTER INSERT en `companies` (`set_company_owner_membership`) para insertar inmediatamente al usuario que crea la compañía como "owner" en `company_users`. Esto garantiza que la consulta `.select()` funcione, eliminando el 42501 en el primer inicio de sesión.

### 2024-05-25 - Limpieza de dependencias innecesarias
**Aprendizaje**: `swr` estaba incluido en `package.json` y `SWRProvider` envuelve a toda la aplicación en `app/layout.tsx`. Sin embargo, en el resto de la aplicación no se utilizaba en ningún lugar.
**Acción**: Se desinstaló `swr` del `package.json` y se eliminó el archivo `SWRProvider`, quitando el wrapper innecesario en `app/layout.tsx` para optimizar un poco el bundle, reducir la complejidad y quitar código muerto.

## 2024-07-25 - Fix Zustand Destructuring Anti-pattern
**Learning:** Destructuring global Zustand stores (like `useSalesStore` or `useAuthStore`) inherently subscribes the component to all state changes within that store. This causes severe performance bottlenecks and unnecessary re-renders in heavy components (like `ReportsManager` with its charts) when orthogonal state like `cart` updates frequently.
**Action:** Always use individual, selective state selectors (e.g., `const addToCart = useSalesStore(state => state.addToCart)`) instead of destructuring the entire store to ensure components only re-render when the specific data they consume changes.
## 2024-07-08 - Zustand Destructuring Anti-pattern
**Learning:** Found multiple instances where the entire Zustand store (e.g. `useSalesStore`) is destructured in a single call (e.g. `const { cart, getCartTotal } = useSalesStore()`), which is an anti-pattern that causes unnecessary re-renders when other state changes. The duplicated folder structure (`features/` vs `src/features/`) means this needs to be fixed in multiple places.
**Action:** When using Zustand stores, always extract state values using individual selectors (e.g. `const cart = useSalesStore(state => state.cart)`). Use string replacements to fix existing instances safely.
