1. **Identify Performance Opportunity**: The `CartItemRow` component in `src/features/sales/components/SalesTerminal.tsx` and `features/sales/components/SalesTerminal.tsx` is wrapped in `React.memo()`. However, the `onRemove` prop passed to it is `handleRemoveFromCart`, which is an inline arrow function that gets recreated on every render of `SalesTerminal`. This causes `CartItemRow` to re-render unnecessarily on every state change in `SalesTerminal` (e.g., when typing a number or amount), defeating the purpose of `React.memo()`.

2. **Implement Optimization**:
   - In both `src/features/sales/components/SalesTerminal.tsx` and `features/sales/components/SalesTerminal.tsx`.
   - Import `useCallback` from 'react'.
   - Wrap the `handleRemoveFromCart` function with `useCallback`.
   - The dependency array should include `removeFromCart`, `cart.length`, and `setLocked`.
   - Update `CartItemRow` props type to better describe `item`.

3. **Complete pre commit steps**: Ensure proper testing, verification, review, and reflection are done by running `pnpm build` or `pnpm tsc --noEmit` if possible, and checking standard linters.

4. **Create PR**: Create a PR with title "⚡ Bolt: [performance improvement]" and required description.
