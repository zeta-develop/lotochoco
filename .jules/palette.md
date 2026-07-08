## 2026-07-07 - Duplicated Component Directories
**Learning:** The project contains duplicated feature and component directories (e.g., `src/components/` and `components/`). When adding small UX enhancements like ARIA labels, it is critical to apply them to both locations to ensure consistency due to existing module resolution quirks.
**Action:** Always run `grep -rn` across the entire project root (or specifically both `src/` and root-level directories) when searching for components to enhance, and ensure modifications are duplicated across identical files.
