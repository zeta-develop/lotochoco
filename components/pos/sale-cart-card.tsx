'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Ticket, ShoppingCart, Trash2, X, Check } from 'lucide-react'
import type { CartItem } from '@/lib/types'

interface SaleCartCardProps {
  cart: CartItem[]
  currency: string
  cartTotal: number
  isCashOpen: boolean
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  onOpenConfirm: () => void
}

export function SaleCartCard({
  cart,
  currency,
  cartTotal,
  isCashOpen,
  onRemoveItem,
  onClearCart,
  onOpenConfirm,
}: SaleCartCardProps) {
  return (
    <Card className="border-none shadow-xl bg-card/40 rounded-3xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="bg-primary/5 pb-6 border-b border-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Ticket className="h-5 w-5" /></div>
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Ticket Actual</CardTitle>
          <Badge className="ml-auto bg-primary text-white border-none rounded-full px-3">{cart.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <div className="p-4 bg-muted/50 rounded-full"><ShoppingCart className="h-10 w-10 opacity-30" /></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">El ticket está vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="group flex flex-col gap-2 rounded-2xl border-2 border-muted bg-background p-4 transition-all hover:border-primary/30 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase">
                  {item.gameName}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" /> {item.scheduleName}
                  </div>
                  <div className="font-mono text-3xl font-black text-foreground">
                    {item.number}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-primary">
                    {currency}{item.amount.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                    Gana: {currency}{(item.amount * item.multiplier).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <div className="border-t-2 border-dashed border-muted p-6 space-y-6 bg-muted/10">
        <div className="flex items-center justify-between text-lg font-black uppercase tracking-tighter">
          <span>Total a Pagar</span>
          <span className="text-3xl text-primary">{currency}{cartTotal.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onClearCart}
            disabled={cart.length === 0}
            className="h-14 rounded-2xl font-black uppercase text-[10px] border-2 shadow-sm"
          >
            <X className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button
            onClick={onOpenConfirm}
            disabled={cart.length === 0 || !isCashOpen}
            className="h-14 rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            <Check className="mr-2 h-4 w-4" />
            Imprimir Venta
          </Button>
        </div>
      </div>
    </Card>
  )
}