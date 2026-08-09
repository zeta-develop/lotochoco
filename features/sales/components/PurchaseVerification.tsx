'use client'

import { useEffect, useMemo } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Printer, Repeat, Share2 } from 'lucide-react'
import type { CartItem } from '../domain/types'

interface PurchaseVerificationProps {
  cart: CartItem[]
  currency: string
  isProcessing: boolean
  onBack: () => void
  onShare: () => void
  onConfirm: () => void
}

/**
 * Página completa de verificación de compra (reemplaza el modal anterior).
 *
 * Muestra las 15 jugadas simultáneamente sin scroll vertical, agrupando
 * la información común (juego/sorteo) una sola vez. Ocupa todo el viewport
 * disponible del área de contenido.
 *
 * Layout:
 *   [← Verificar compra]
 *   [HONDUREÑA · 9:00 PM]
 *   [15 jugadas compactas]
 *   [TOTAL]
 *   [Compartir] [Repetir] [Imprimir]
 */
export function PurchaseVerification({
  cart,
  currency,
  isProcessing,
  onBack,
  onShare,
  onConfirm,
}: PurchaseVerificationProps) {
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.amount, 0), [cart])

  // Información agrupada: si todas las jugadas comparten juego/sorteo, se
  // muestra una sola vez (no repetida en cada fila)
  const gameName = cart[0]?.gameName || ''
  const scheduleName = cart[0]?.scheduleName || ''
  const allSameGame = cart.every((i) => i.gameName === gameName)
  const allSameSchedule = cart.every((i) => i.scheduleName === scheduleName)
  const showContext = allSameGame || allSameSchedule

  // Android Back Button: regresa a la pantalla anterior conservando el carrito
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let handler: { remove: () => void } | null = null
    App.addListener('backButton', () => {
      onBack()
    }).then((h) => {
      handler = h
    })

    return () => {
      handler?.remove()
    }
  }, [onBack])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header compacto: navegación propia, área táctil 44px+ */}
      <header className="flex items-center gap-2 px-1 pt-1 pb-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          onClick={onBack}
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-[15px] font-black uppercase tracking-tighter text-foreground leading-tight truncate">
            Verificar compra
          </h1>
          {showContext && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight truncate">
              {allSameGame && <span className="text-primary">{gameName}</span>}
              {allSameGame && allSameSchedule && <span className="mx-1">·</span>}
              {allSameSchedule && <span>{scheduleName}</span>}
            </p>
          )}
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] rounded-full px-2.5">
          {cart.length}/15
        </Badge>
      </header>

      {/* Lista compacta de jugadas: 15 filas visibles sin scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-12 items-center gap-1 px-2 py-1.5 border-b border-muted/60 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4 pl-1">Número</div>
          <div className="col-span-3 text-right">Monto</div>
          <div className="col-span-5 text-right pr-1">Premio</div>
        </div>

        <div className="h-[calc(100%-26px)] overflow-hidden">
          <div className="flex flex-col">
            {cart.map((item) => {
              const prize = (item.amount || 0) * (item.multiplier || 0)
              const number = item.number
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center gap-1 px-2 py-[5px] border-b border-muted/30 min-h-[32px]"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[15px] font-black text-foreground leading-none tracking-tight">
                      {number}
                    </span>
                    {!showContext && (
                      <span className="text-[8px] font-bold text-muted-foreground uppercase truncate">
                        {item.gameName}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-[13px] font-black text-primary leading-none">
                      {currency}{item.amount.toFixed(0)}
                    </span>
                  </div>
                  <div className="col-span-5 text-right pr-1">
                    <span className="text-[11px] font-bold text-muted-foreground leading-none">
                      {currency}{prize.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Total fijo, siempre visible */}
      <div className="shrink-0 border-t-2 border-muted/60 px-2 py-2 flex items-center justify-between bg-muted/10">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Total
        </span>
        <span className="text-2xl font-black text-primary leading-none tracking-tighter">
          {currency}{total.toFixed(2)}
        </span>
      </div>

      {/* Acciones: Imprimir primaria, secundarias compactas */}
      <div className="shrink-0 grid grid-cols-3 gap-2 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        <Button
          variant="outline"
          onClick={onShare}
          disabled={isProcessing}
          className="h-11 rounded-xl font-black uppercase text-[9px] border-2 flex flex-col gap-0.5"
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </Button>
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={isProcessing}
          className="h-11 rounded-xl font-black uppercase text-[9px] flex flex-col gap-0.5"
        >
          <Repeat className="h-4 w-4" />
          Repetir
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isProcessing || cart.length === 0}
          className="h-11 rounded-xl font-black uppercase text-[9px] bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-all flex flex-col gap-0.5"
        >
          {isProcessing ? (
            <>
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Procesando
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" />
              Imprimir
            </>
          )}
        </Button>
      </div>

      {/* Nota de confirmación */}
      <p className="shrink-0 text-center text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest pb-1 flex items-center justify-center gap-1">
        <Check className="h-3 w-3 text-primary" />
        Verifica el monto antes de generar el ticket
      </p>
    </div>
  )
}
