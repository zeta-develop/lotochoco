import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getTicket: vi.fn(), company: vi.fn(), emit: vi.fn(), userId: 'u', selected: 'tenant' }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }))
vi.mock('@/lib/supabase/company', () => ({ requireCompanyId: mocks.company }))
vi.mock('@/features/tickets/services/tickets.service', () => ({ ticketsService: { getTicketById: mocks.getTicket } }))
vi.mock('@/store/auth-store', () => ({ useAuthStore: { getState: () => ({ user: { id: mocks.userId }, selectedCompanyId: mocks.selected }) } }))
vi.mock('@/lib/events', () => ({ dbEvents: { emit: mocks.emit } }))
import { salesRepository } from './sales.repository'
const request = { requestId: 'same-operation', items: [{ gameId: 'g', gameName: 'Juego', number: '01', amount: 20, schedule: '12:00', scheduleName: 'Mediodía' }] }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.userId = 'u'
  mocks.selected = 'tenant'
  mocks.company.mockResolvedValue('tenant')
  mocks.rpc.mockResolvedValue({ data: 'ticket', error: null })
  mocks.getTicket.mockResolvedValue({ id: 'ticket' })
})
describe('atomic sale transport', () => {
  it('sends one company-scoped idempotent transaction and recovers its ticket', async () => {
    await expect(salesRepository.createSale(request)).resolves.toEqual({ id: 'ticket' })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('pos_create_sale', {
      p_company_id: 'tenant', p_request_id: 'same-operation', p_client: null,
      p_items: [{ gameId: 'g', number: '01', amount: 20, schedule: '12:00' }]
    })
  })
  it('distinguishes definite rollback from uncertain transport failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Caja cerrada' } })
    await expect(salesRepository.createSale(request)).rejects.toMatchObject({ saleRolledBack: true })
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '', message: 'Failed to fetch' } })
    await expect(salesRepository.createSale(request)).rejects.toMatchObject({ saleRolledBack: false })
    expect(mocks.getTicket).not.toHaveBeenCalled()
  })
  it('preserves uncertain confirmation when the transaction committed but receipt could not be read', async () => {
    mocks.getTicket.mockResolvedValue(null)
    await expect(salesRepository.createSale(request)).rejects.toThrow('misma operación')
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
  it('does not classify receipt read permission failure as a rolled-back sale', async () => {
    const receiptError = { code: '42501', message: 'Permission denied' }
    mocks.getTicket.mockRejectedValue(receiptError)
    await expect(salesRepository.createSale(request)).rejects.toBe(receiptError)
    expect(receiptError).not.toHaveProperty('saleRolledBack')
  })
  it('rejects a request bound to another company before sending it', async () => {
    await expect(salesRepository.createSale({ ...request, companyId: 'other' })).rejects.toThrow('otra empresa')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects a response after switching identity without marking the sale rolled back', async () => {
    mocks.rpc.mockImplementationOnce(async () => {
      mocks.userId = 'other'
      return { data: 'ticket', error: null }
    })
    await expect(salesRepository.createSale(request)).rejects.toThrow('cuenta original')
    expect(mocks.getTicket).not.toHaveBeenCalled()
  })

})
