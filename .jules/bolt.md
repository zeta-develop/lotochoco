## 2024-05-24 - Duplicate database fetch/subscription
**Learning:** Some views imported two hooks (`useWinnersManager` and `usePendingWinners`) where the second hook wrapped the first hook. This caused 2 full database query executions on mount and 2 redundant Supabase real-time subscriptions, as well as multiple state evaluations.
**Action:** When working with context or state hooks that fetch all data, ensure that derived states (like filtered lists or sums) are generated synchronously via `useMemo` in the component tree, instead of duplicating the hook entirely.
