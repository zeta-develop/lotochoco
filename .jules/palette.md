## 2024-06-01 - Add aria-label to icon-only buttons
**Learning:** The codebase heavily uses a custom `<Button size="icon">` component, but these instances often lack `aria-label` attributes across different modules, which degrades accessibility for screen readers. This pattern appears frequently in `MainLayout.tsx`, `ReportsManager.tsx`, `SalesTerminal.tsx`, and `GamesManager.tsx`.
**Action:** Next time I look at React code, I will search for icon-only buttons (especially with `size="icon"`) and ensure they include descriptive `aria-label`s.
