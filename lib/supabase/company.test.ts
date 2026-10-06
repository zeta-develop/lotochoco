import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), memberships: vi.fn(), selected: null as string | null, userId: 'u' as string | null }))
vi.mock('./client', () => ({ supabase: {
  auth: { getSession: mocks.getSession },
  from: () => ({ select: () => ({ eq: mocks.memberships }) })
} }))
vi.mock('@/store/auth-store', () => ({ useAuthStore: { getState: () => ({ selectedCompanyId: mocks.selected, user: mocks.userId ? { id: mocks.userId } : null }) } }))
import { requireCompanyId } from './company'

beforeEach(() => {
  mocks.selected = null
  mocks.userId = 'u'
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } }, error: null })
  mocks.memberships.mockResolvedValue({ data: [{ company_id: 'a' }], error: null })
})
describe('company isolation', () => {
  it('resolves the only membership', async () => expect(await requireCompanyId()).toBe('a'))
  it('requires an explicit selection for multiple memberships', async () => {
    mocks.memberships.mockResolvedValue({ data: [{ company_id: 'a' }, { company_id: 'b' }], error: null })
    await expect(requireCompanyId()).rejects.toThrow('Selecciona')
    mocks.selected = 'b'
    expect(await requireCompanyId()).toBe('b')
  })
  it('rejects a revoked selection rather than silently switching tenants', async () => {
    mocks.selected = 'b'
    await expect(requireCompanyId()).rejects.toThrow('ya no está disponible')
  })
  it('requires a current authenticated session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(requireCompanyId()).rejects.toThrow('Inicia sesión')
  })
  it('propagates membership failures', async () => {
    const error = new Error('network')
    mocks.memberships.mockResolvedValue({ data: null, error })
    await expect(requireCompanyId()).rejects.toBe(error)
  })
  it('rejects a company switch while memberships are loading', async () => {
    mocks.memberships.mockImplementationOnce(async () => {
      mocks.selected = 'b'
      return { data: [{ company_id: 'a' }, { company_id: 'b' }], error: null }
    })
    await expect(requireCompanyId()).rejects.toThrow('cambió durante')
  })
  it('rejects logout or identity changes during session resolution', async () => {
    mocks.getSession.mockImplementationOnce(async () => {
      mocks.userId = null
      return { data: { session: { user: { id: 'u' } } }, error: null }
    })
    await expect(requireCompanyId()).rejects.toThrow('cambió durante')
  })

})
