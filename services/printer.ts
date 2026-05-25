import { Ticket, CashSession } from '@/lib/types'

export const printerService = {
  printTicket: async (ticket: Ticket, settings: any) => { return true },
  printClose: async (session: CashSession, settings: any) => { return true },
  testPrinter: async (type: string, address: string) => { return true }
}

export const testPrinter = printerService.testPrinter
