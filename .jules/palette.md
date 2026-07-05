
## 2024-05-18 - Missing ARIA labels on Icon-only Buttons
**Learning:** The application extensively uses `<Button size="icon">` and `<Button size="icon-sm">` for core layout actions like opening/closing sidebars and refreshing data, but these lack screen-reader accessible `aria-label`s.
**Action:** Always verify icon-only buttons have descriptive `aria-label`s in Spanish to ensure accessibility.
