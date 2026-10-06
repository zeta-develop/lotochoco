import { beforeEach, describe, expect, it } from 'vitest'
import { useSalesStore } from './sales.store'
const item = { gameId: 'game', gameName: 'Juego', schedule: '12:00', scheduleName: 'Mediodía', number: '01', amount: 20 }
beforeEach(() => useSalesStore.setState(useSalesStore.getInitialState(), true))
describe('uncertain sale recovery', () => {
  it('preserves the operation id and original payload across retries', () => {
    useSalesStore.getState().addToCart(item)
    const first = useSalesStore.getState().beginSale({ items: [item], client: 'Ana' }, 'company')
    const retry = useSalesStore.getState().beginSale({ items: [{ ...item, amount: 50 }], client: 'Otro' }, 'company')
    expect(retry).toEqual(first)
    expect(first.requestId).toBeTruthy()
    expect(retry.client).toBe('Ana')
  })
  it('protects the pending cart from editing and clearing', () => {
    useSalesStore.getState().addToCart(item)
    useSalesStore.getState().beginSale({ items: [item] }, 'company')
    useSalesStore.getState().clearCart()
    useSalesStore.getState().addToCart({ ...item, amount: 100 })
    useSalesStore.getState().setCart([])
    expect(useSalesStore.getState().cart).toHaveLength(1)
    useSalesStore.getState().completeSale()
    expect(useSalesStore.getState().cart).toEqual([])
    expect(useSalesStore.getState().pendingSale).toBeNull()
  })
  it('cannot replay the operation against a different company', () => {
    useSalesStore.getState().beginSale({ items: [item] }, 'a')
    expect(() => useSalesStore.getState().beginSale({ items: [item] }, 'b')).toThrow('empresa original')
  })
})
