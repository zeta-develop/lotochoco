## 2024-05-24 - Memoize Stats Array in Dashboard
**Learning:** Recreating objects/arrays unnecessarily on each render, even if small, can lead to performance degradation if they are used to render multiple children components like `Card`, `Badge`, and `Trophy` inside the Dashboard, as those components will re-render even when underlying values haven't changed.
**Action:** Always memoize derived array/objects that drive iterations/loops inside main dashboard/container components when depending on values fetched from stores/hooks, so that children can optimally use memoization if present.
