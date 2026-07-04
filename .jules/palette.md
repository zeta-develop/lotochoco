## 2024-07-04 - Missing ARIA labels on icon buttons
**Learning:** The codebase heavily uses `<Button size="icon">` components for interactive elements, but these consistently lack `aria-label` attributes, severely impacting screen reader users. The application interface is in Spanish, so all labels must be provided in Spanish.
**Action:** Whenever using or reviewing `<Button size="icon">`, proactively add descriptive `aria-label` and `title` attributes in Spanish to ensure accessibility.
