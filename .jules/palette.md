## 2025-02-18 - Add ARIA Labels to Main Layout icon buttons
**Learning:** Found an accessibility issue pattern specific to this app where custom icon-only `<Button size="icon">` components frequently lack `aria-label`s. This is particularly prevalent in main layout components.
**Action:** Always verify `aria-label` attributes on icon-only buttons (`size="icon"`) inside header/layout structures to ensure basic accessibility for screen readers. Added Spanish ARIA labels since the UI is localized to Spanish.
