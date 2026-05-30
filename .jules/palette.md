## 2024-05-30 - Missing ARIA labels in icon-only buttons
**Learning:** Found multiple icon-only `<Button>` components (like Trash, Menu, X, RefreshCw) across the app (SalesTerminal, MainLayout, ReportsManager, GamesManager) that lack `aria-label` attributes. This makes them inaccessible to screen readers.
**Action:** When auditing or building Next.js/React applications, systematically search for `size="icon"` or buttons containing only `<svg>` / icon components and ensure they have descriptive `aria-label` or `title` attributes for accessibility.
