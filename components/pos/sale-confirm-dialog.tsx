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
import { Check } from 'lucide-react'

interface SaleConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartCount: number
  cartTotal: number
  currency: string
  isProcessing: boolean
  onConfirm: () => void
}

export function SaleConfirmDialog({
  open,
  onOpenChange,
  cartCount,
  cartTotal,
  currency,
  isProcessing,
  onConfirm,
}: SaleConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md p-0 overflow-hidden">
        <div className="bg-primary/5 p-6 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Confirmar Venta
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2">
              Por favor, verifica el monto antes de generar el ticket.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-muted p-5 bg-muted/10 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-muted/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Líneas de Jugada</span>
              <span className="bg-primary/10 text-primary border-none rounded-xl font-black px-3 py-1 text-xs">{cartCount}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs font-black uppercase tracking-widest">Total:</span>
              <span className="text-4xl font-black text-primary">{currency}{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 rounded-xl font-black uppercase text-[10px] border-2">
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={isProcessing} className="h-12 rounded-xl font-black uppercase text-[10px] shadow-lg">
              {isProcessing ? 'Procesando...' : 'Confirmar e Imprimir'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
