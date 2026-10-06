import { useSalesStore } from '../features/sales/store/sales.store';

type Recovery = Pick<ReturnType<typeof useSalesStore.getState>, 'cart' | 'pendingSale'>;
const memory = new Map<string, Recovery>();
const key = (userId: string) => `lotochoco-pending-sale-recovery:${userId}`;

// Keep an uncertain transaction out of the active stores after logout. Only the
// same authenticated identity can recover its original idempotency key.
export function archivePendingSale(userId: string | undefined) {
  const { cart, pendingSale } = useSalesStore.getState();
  if (!userId || !pendingSale) return;
  const recovery = { cart, pendingSale };
  memory.set(userId, recovery);
  try { localStorage.setItem(key(userId), JSON.stringify(recovery)); } catch { /* Memory recovery remains available. */ }
}

export function recoverPendingSale(userId: string): Recovery | null {
  let recovery = memory.get(userId);
  if (!recovery) {
    try { recovery = JSON.parse(localStorage.getItem(key(userId)) ?? 'null') as Recovery | undefined; } catch { return null; }
  }
  if (!recovery || !Array.isArray(recovery.cart) || !recovery.pendingSale ||
      typeof recovery.pendingSale.companyId !== 'string' || typeof recovery.pendingSale.requestId !== 'string' ||
      !Array.isArray(recovery.pendingSale.items)) return null;
  return recovery;
}

export function clearPendingSaleRecovery(userId: string) {
  memory.delete(userId);
  try { localStorage.removeItem(key(userId)); } catch { /* Storage may be unavailable. */ }
}
