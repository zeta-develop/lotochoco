import { describe, expect, it, vi } from 'vitest'
vi.mock('../repositories/sales.repository', () => ({ salesRepository: { createSale: vi.fn() } }))
import { validateSale } from './sales.service'
const item = { gameId: 'game', gameName: 'Juego', schedule: '12:00', scheduleName: 'Mediodía', number: '01', amount: 20 }
describe('sale validation', () => {
  it('rejects empty, nonfinite, nonpositive and malformed bets before sending', () => {
    expect(() => validateSale({ items: [] })).toThrow()
    for (const amount of [NaN, Infinity, -1, 0]) expect(() => validateSale({ items: [{ ...item, amount }] })).toThrow()
    expect(() => validateSale({ items: [{ ...item, number: 'abc' }] })).toThrow()
    expect(() => validateSale({ items: [{ ...item, schedule: '' }] })).toThrow()
  })
  it('preserves zero-padded valid numbers', () => expect(() => validateSale({ items: [item] })).not.toThrow())
})
