import { supabase } from '@/lib/supabase/client';
import { generateId } from '@/lib/utils';
import type { SaleRequest } from '../domain/types';
import type { Ticket } from '@/lib/types';
import { ticketsService } from '@/features/tickets/services/tickets.service'; // Reusing the mapper from existing service
import { dbEvents } from '@/lib/events';

export class SalesRepository {
  private async generateTicketNumber(): Promise<string> {
    const { data: result } = await supabase
      .from('tickets')
      .select('ticket_number')
      .order('ticket_number', { ascending: false })
      .limit(1)
      .single();

    if (!result || !result.ticket_number) {
      return '#00000001';
    }
    const currentNum = parseInt(result.ticket_number.replace('#', ''));
    return `#${(currentNum + 1).toString().padStart(8, '0')}`;
  }

  async createSale(request: SaleRequest): Promise<Ticket> {
    const ticketId = generateId();
    const ticketNumber = await this.generateTicketNumber();
    const totalAmount = request.items.reduce((sum, item) => sum + item.amount, 0);
    const now = new Date().toISOString();

    // 1. Insert Ticket
    const { error: ticketError } = await supabase.from('tickets').insert({
      id: ticketId,
      ticket_number: ticketNumber,
      total_amount: totalAmount,
      status: 'active',
      client: request.client || null,
      created_at: now,
      updated_at: now
    });
    if (ticketError) throw ticketError;

    // 2. Insert Items
    const itemsToInsert = request.items.map(item => ({
      id: generateId(),
      ticket_id: ticketId,
      game_id: item.gameId,
      number: item.number,
      amount: item.amount,
      schedule: item.schedule,
      created_at: now,
      updated_at: now
    }));
    
    const { error: itemsError } = await supabase.from('ticket_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 3. Update Cash Session & Register Movement
    const { data: openSession } = await supabase
      .from('cash_sessions')
      .select('id, sales_total')
      .eq('status', 'open')
      .limit(1)
      .single();

    if (openSession) {
      const sessionId = openSession.id;
      
      await supabase.from('cash_sessions').update({
        sales_total: (openSession.sales_total || 0) + totalAmount,
        updated_at: now
      }).eq('id', sessionId);

      await supabase.from('cash_movements').insert({
        id: generateId(),
        cash_session_id: sessionId,
        type: 'sale',
        amount: totalAmount,
        description: `Venta Ticket ${ticketNumber}`,
        created_at: now,
        updated_at: now
      });
    }

    // Emit events
    dbEvents.emit('tickets:changed');
    dbEvents.emit('cash:changed');

    // Return created ticket
    const newTicket = await ticketsService.getTicketById(ticketId);
    if (!newTicket) throw new Error("Error retrieving created ticket");
    return newTicket;
  }
}

export const salesRepository = new SalesRepository();
