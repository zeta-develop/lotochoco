## 2026-06-08 - Accessibility of core layout buttons
**Learning:** Found that core layout navigation (`MainLayout`) heavily uses icon-only buttons (like Menu, X, and Refresh) without accessible names. This is an accessibility issue pattern specific to this app's layout components.
**Action:** When working on layout or navigation components, ensure that all icon-only buttons include descriptive `aria-label`s in Spanish to provide accessible names for screen reader users.
