'use client';
import { useAuthStore } from '@/store/auth-store'
import { useSalesStore } from '../store/sales.store'
import { requireCompanyId } from '@/lib/supabase/company'

import { useRef, useState } from 'react';
import { salesService, validateSale } from '../services/sales.service';
import type { SaleRequest } from '../domain/types';
import type { Ticket } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

export function useCheckout() {
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (request: SaleRequest): Promise<Ticket | null> => {
    if (processingRef.current) return null;
    processingRef.current = true;
    setIsProcessing(true);
    const initialUserId = useAuthStore.getState().user?.id;
    let operationId: string | undefined;
    try {
      validateSale(request);
      const companyId = await requireCompanyId();
      const durableRequest = useSalesStore.getState().beginSale(request, companyId);
      operationId = durableRequest.requestId;
      const ticket = await salesService.processSale(durableRequest);
      if (useAuthStore.getState().user?.id !== initialUserId || useSalesStore.getState().pendingSale?.requestId !== operationId) {
        return null;
      }
      useSalesStore.getState().completeSale();
      toast({ title: `Ticket ${ticket.ticketNumber} creado exitosamente` });
      return ticket;
    } catch (error) {
      // PostgreSQL error codes mean the RPC transaction rolled back; transport
      // failures remain uncertain and must preserve the same request for retry.
      if (useAuthStore.getState().user?.id !== initialUserId) return null;
      if ((error as { saleRolledBack?: boolean })?.saleRolledBack && useSalesStore.getState().pendingSale?.requestId === operationId) {
        useSalesStore.setState({ pendingSale: null });
      }
      console.error('Error procesando la venta:', error);
      toast({
        variant: 'destructive',
        title: error instanceof Error ? error.message : 'No se pudo confirmar la venta. Reintenta para recuperar la misma operación'
      });
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processSale
  };
}
