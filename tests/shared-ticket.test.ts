import { describe, expect, it } from 'vitest'
import { buildSharedTicketHtml } from '@/features/tickets/utils/shared-ticket'

const ticket = { id: 'example', ticketNumber: 'DGKRLNPKBZR', createdAt: '2026-09-30T02:49:00Z', totalAmount: 10, client: '<img src=x onerror=alert(1)>', items: [
  { number: '07', amount: 5, schedule: '21:00', game: { name: 'Hondureña', multiplier: 80 } },
  { number: '00', amount: 5, schedule: '21:00', game: { name: 'Hondureña', multiplier: 80 } },
] }

describe('shared ticket layout', () => {
  it('preserves leading zeroes, every bet, potential prizes and total', () => {
    const html = buildSharedTicketHtml(ticket, { currency: 'C$' }, 'data:image/png;base64,test')
    expect(html).toContain('>07</strong>')
    expect(html).toContain('>00</strong>')
    expect(html.match(/C\$ 400\.00/g)).toHaveLength(2)
    expect(html).toContain('C$ 10.00')
    expect(html).toContain('width:600px')
  })
  it('escapes customer data rather than injecting HTML', () => {
    const html = buildSharedTicketHtml(ticket, {}, '')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('Yamileth')
  })
  it('labels mixed games on individual rows and previews as unregistered', () => {
    const html = buildSharedTicketHtml({ ...ticket, id: 'preview', items: [...ticket.items, { number: '012', amount: 1, schedule: '15:00', game: { name: 'Juega 3', multiplier: 600 } }] }, {}, '')
    expect(html).toContain('SIN VENTA REGISTRADA')
    expect(html).toContain('Juega 3 ·')
    expect(html).not.toContain('<img')
  })
  it('marks cancelled tickets clearly', () => {
    expect(buildSharedTicketHtml({ ...ticket, status: 'cancelled' }, {}, '')).toContain('BOLETO ANULADO')
  })
})
