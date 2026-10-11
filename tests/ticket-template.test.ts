import { describe, expect, it } from 'vitest'
import { DEFAULT_TICKET_TEMPLATE, formatDoubleWidthItemRow, parseTemplateToBlocks } from '../features/settings/utils/ticket-template'

describe('ticket editor indentation', () => {
  const ticket = { ticketNumber: 'HGFHVGTKLY', items: [{ number: '22', amount: 5, multiplier: 80 }] }
  it('starts default bets at the left and keeps the alphabetic folio', () => {
    const blocks = parseTemplateToBlocks(DEFAULT_TICKET_TEMPLATE, ticket)
    expect(blocks).toContainEqual(expect.objectContaining({ type: 'text', text: 'Folio: HGFHVGTKLY' }))
    expect(blocks.find(b => b.type === 'item_row')).toMatchObject({ customText: '22     5     400' })
  })
  it('respects zero indentation even with single-space column separators', () => {
    const blocks = parseTemplateToBlocks('{{#items}}\n{{number}} {{amount}} {{prize}}\n{{/items}}', ticket)
    expect(blocks.find(b => b.type === 'item_row')).toMatchObject({ customText: formatDoubleWidthItemRow('22', '5', '400') })
  })
  it('preserves indentation explicitly selected in the editor', () => {
    expect(formatDoubleWidthItemRow('22', '5', '400', '  {{number}} {{amount}} {{prize}}')).toMatch(/^  22/)
    expect(formatDoubleWidthItemRow('22', '5', '400', '{{number}} {{amount}} {{prize}}')).toMatch(/^22/)
  })
})
