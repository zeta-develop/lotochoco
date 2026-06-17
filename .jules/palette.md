## 2025-01-20 - Missing aria-labels on icon-only buttons
**Learning:** The project relies heavily on `<Button size="icon">` and `<Button size="icon-sm">` for core interactive elements like menus, close buttons, and delete actions, but consistently omits `aria-label`s, rendering them inaccessible to screen readers in Spanish.
**Action:** Always check for and add appropriate `aria-label`s in Spanish (e.g., "Abrir menú", "Actualizar datos", "Cerrar") whenever encountering icon-only buttons in the codebase.
