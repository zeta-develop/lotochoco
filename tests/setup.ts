import { vi } from 'vitest'

// Stores must exercise browser persistence rather than silently falling back to
// Zustand's server-only storage path during account-isolation tests.
class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}
vi.stubGlobal('localStorage', new MemoryStorage())
