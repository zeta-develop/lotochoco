## 2024-05-15 - Icon-only buttons lacking ARIA labels
**Learning:** The codebase heavily uses custom `<Button size="icon">` and `<Button size="icon-sm">` components in layout structures like `MainLayout.tsx`, but these often lack `aria-label` attributes for screen readers.
**Action:** When working on navigation or layout components with icon buttons, ensure to add descriptive `aria-label` attributes in Spanish (e.g. "Cerrar menú").
