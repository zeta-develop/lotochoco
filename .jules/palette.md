## 2024-06-05 - Add aria-label to Icon-Only Buttons
**Learning:** Custom `<Button size="icon">` components are heavily utilized throughout the codebase for various actions like deleting, refreshing, and closing modals, but these frequently lack appropriate `aria-label` attributes, creating accessibility barriers.
**Action:** Always verify that any icon-only `<Button>` component includes a descriptive `aria-label` attribute in Spanish (the application's language) to ensure proper screen reader accessibility.
