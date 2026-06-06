## 2024-06-06 - Missing ARIA Labels on Icon Buttons
**Learning:** Across the codebase, there are multiple custom `<Button size="icon">` and `<Button size="icon-sm">` instances that are used solely with icons (like `Trash2`, `Menu`, `X`, `RefreshCw`) but do not have `aria-label`s. This is an accessibility issue for screen readers.
**Action:** When working on this app, always ensure to add descriptive `aria-label`s in Spanish to these icon-only buttons to improve the accessibility.
