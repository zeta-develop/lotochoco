## 2024-05-22 - Optimización de componentes NumPad y AmountPad

**Aprendizaje:** Los componentes de teclados numéricos (`NumPad` y `AmountPad`) definían arreglos estáticos dentro del cuerpo del componente y sus métodos internos no estaban memorizados, lo que provocaba re-renders innecesarios en componentes padre pesados (como `ResultsManager` y `POSSale`).

**Acción:** Aplicar `React.memo` a los componentes e instanciar los arreglos estáticos fuera del ciclo de renderizado.

## 2026-05-22 - Capacitor + Supabase Google OAuth

**Aprendizaje:** When implementing OAuth with Supabase in a Capacitor environment without Ionic React, the manual handling of `Browser` from `@capacitor/browser` combined with `skipBrowserRedirect: true` is required, while keeping the web implementation working via redirect.

**Acción:** Used `Capacitor.isNativePlatform()` to conditionally trigger the Android/Web auth flow and set up `App.addListener('appUrlOpen')` to capture deep links with OAuth tokens on native.
