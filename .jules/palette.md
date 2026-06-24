## 2024-06-24 - Missing ARIA Labels on Icon Buttons
**Learning:** The codebase heavily uses custom `<Button size="icon">` components for various actions like deleting items, closing modals, and opening menus. However, these instances consistently lack `aria-label` attributes, making them inaccessible to screen reader users in Spanish.
**Action:** Always ensure icon-only buttons include descriptive `aria-label`s in Spanish to maintain accessibility standards.
