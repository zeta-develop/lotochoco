## 2024-05-18 - Missing ARIA Labels in Global Navigation
**Learning:** The global `MainLayout` component relies heavily on `<Button size="icon">` for critical navigation (menu toggle, global refresh), yet these lack accessible names. This pattern isolates screen reader users from basic app operation.
**Action:** Consistently add `aria-label` (in Spanish) to all layout-level icon buttons to ensure the primary app shell remains accessible to assistive tech.
