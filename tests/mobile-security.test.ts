import { describe, expect, it, vi, beforeEach } from 'vitest'
import { isNewerRelease } from '../features/updater/version'

const ble = vi.hoisted(() => ({ initialize: vi.fn(), getServices: vi.fn(), requestConnectionPriority: vi.fn(), getMtu: vi.fn(), writeWithoutResponse: vi.fn(), write: vi.fn() }))
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: ble, ConnectionPriority: { CONNECTION_PRIORITY_HIGH: 1 } }))
import { bluetoothService } from '../features/settings/services/bluetooth.service'

describe('safe update comparisons', () => {
  it('does not offer equal or older Android builds', () => {
    expect(isNewerRelease('v1.8.6-127', '1.8.6-127')).toBe(false)
    expect(isNewerRelease('v1.8.6-126', '1.8.6-127')).toBe(false)
    expect(isNewerRelease('v1.9.0-126', '1.8.6-127')).toBe(false)
    expect(isNewerRelease('v1.8.6-128', '1.8.6-127')).toBe(true)
  })
  it('compares numeric version components for web and rejects malformed tags', () => {
    expect(isNewerRelease('v1.10.0', '1.9.0')).toBe(true)
    expect(isNewerRelease('v1.8.0', '1.9.0')).toBe(false)
    expect(isNewerRelease('v1.9.0-beta', '1.8.0')).toBe(false)
  })
})

describe('printer BLE profile', () => {
  beforeEach(() => { vi.clearAllMocks(); bluetoothService.isInitialized = false; ble.getMtu.mockResolvedValue(23) })
  it('rejects an unrelated writable service without sending commands', async () => {
    ble.getServices.mockResolvedValue([{ uuid: 'wrong', characteristics: [{ uuid: 'wrong', properties: { write: true } }] }])
    await expect(bluetoothService.writeData('device', new Uint8Array([27, 64]))).rejects.toThrow('perfil Bluetooth')
    expect(ble.write).not.toHaveBeenCalled()
    expect(ble.writeWithoutResponse).not.toHaveBeenCalled()
  })
  it('writes only to the known printer characteristic', async () => {
    const service = '000018f0-0000-1000-8000-00805f9b34fb'
    const characteristic = '00002af1-0000-1000-8000-00805f9b34fb'
    ble.getServices.mockResolvedValue([{ uuid: service, characteristics: [{ uuid: 'unrelated', properties: { writeWithoutResponse: true } }, { uuid: characteristic, properties: { write: true } }] }])
    await bluetoothService.writeData('device', new Uint8Array([27, 64]))
    expect(ble.write).toHaveBeenCalledWith('device', service, characteristic, expect.any(DataView))
    expect(ble.writeWithoutResponse).not.toHaveBeenCalled()
  })
})

import { printerService } from '../features/settings/services/printer.service'
import { resolveTicketData } from '../features/settings/utils/ticket-template'
import type { Ticket } from '../lib/types'

describe('printer status and duplicate receipt', () => {
  const ticket = { id: 'ticket', ticketNumber: '#00000001', createdAt: '2026-10-06T12:00:00Z', totalAmount: 10, items: [] } as unknown as Ticket
  it('never reports an unsupported network printer as a successful print', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(await printerService.printTicket(ticket, { printerType: 'network' })).toBe(false)
      expect(await printerService.testPrinter('network', '192.168.1.100')).toBe(false)
    } finally { error.mockRestore() }
  })
  it('labels a reprint as a copy while keeping the original unlabelled', () => {
    expect(resolveTicketData(ticket, {}, true).receiptType).toContain('COPIA REIMPRESA')
    expect(resolveTicketData(ticket, {}, false).receiptType).toBe('')
  })
})
