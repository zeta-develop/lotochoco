'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Printer, Share2 } from 'lucide-react'
import type { Ticket } from '@/lib/types'

interface SaleSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  currency: string
  onShare: () => void
  onPrint: () => void
}

export function SaleSuccessDialog({
  open,
  onOpenChange,
  ticket,
  currency,
  onShare,
  onPrint,
}: SaleSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md p-0 overflow-hidden text-center">
        <div className="bg-green-500/10 p-8 border-b border-green-500/10 flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
            <Check className="h-8 w-8" />
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-green-700 dark:text-green-400">¡Venta Exitosa!</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-1">El ticket se generó en la base de datos.</DialogDescription>
          </DialogHeader>
        </div>

        {ticket && (
          <div className="p-6">
            <div className="rounded-2xl bg-muted/30 border border-muted-foreground/10 p-6 flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número de Ticket</span>
              <span className="font-mono text-3xl font-black tracking-widest text-foreground">{ticket.ticketNumber}</span>
              <div className="mt-4 pt-4 border-t border-muted-foreground/10 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest">Total</span>
                <span className="text-xl font-black text-primary">{currency}{ticket.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 pt-0 bg-background">
          <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] border-2">
              Cerrar
            </Button>
            <Button variant="secondary" onClick={onShare} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
            <Button onClick={onPrint} className="w-full sm:w-1/3 h-12 rounded-xl font-black uppercase text-[10px] shadow-lg">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
