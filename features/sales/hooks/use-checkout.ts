'use client';

import { useState } from 'react';
import { salesService } from '../services/sales.service';
import type { SaleRequest } from '../domain/types';
import type { Ticket } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

export function useCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (request: SaleRequest): Promise<Ticket | null> => {
    setIsProcessing(true);
    try {
      const ticket = await salesService.processSale(request);
      toast({ title: `Ticket ${ticket.ticketNumber} creado exitosamente` });
      return ticket;
    } catch (error) {
      console.error('Error procesando la venta:', error);
      toast({ 
        variant: 'destructive', 
        title: error instanceof Error ? error.message : 'Error al procesar la venta' 
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processSale
  };
}
