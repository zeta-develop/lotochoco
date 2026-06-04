## 2026-06-04 - Add aria-labels to icon buttons
**Learning:** The app frequently uses `size="icon"` and `size="icon-sm"` on Buttons, but many of these icon-only buttons lack `aria-label` attributes, which impairs accessibility for screen reader users in Spanish.
**Action:** Add descriptive `aria-label` attributes in Spanish to icon-only buttons across the application components (e.g., MainLayout, ReportsManager, GamesManager, SalesTerminal).
