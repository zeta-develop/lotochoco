## 2024-05-14 - Icon Button Accessibility
**Learning:** The codebase heavily uses custom `<Button size="icon">` and `<Button size="icon-sm">` components for layout navigation and actions (e.g., in MainLayout.tsx), but these lack `aria-label` attributes, making them inaccessible to screen readers in the app's default language (Spanish).
**Action:** When adding or modifying icon-only buttons, always include descriptive `aria-label`s in Spanish (e.g., "Cerrar menú", "Abrir menú", "Actualizar datos") to ensure screen reader accessibility.
