'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Printer, Repeat, Share2, Trash2 } from 'lucide-react'
import type { CartItem } from '../domain/types'
import type { Ticket, TicketItem, Game } from '@/lib/types'

export type TicketWithDetails = Ticket & {
  items?: (TicketItem & { game?: Game })[]
}

interface PurchaseVerificationProps {
  /** Modo checkout: cart viene del store y onConfirm crea la venta. */
  cart?: CartItem[]
  /** Modo view: ticket ya vendido (reportes). onReprint solo reimprime. */
  ticket?: TicketWithDetails
  currency: string
  isProcessing: boolean
  onBack: () => void
  onShare: (element: HTMLElement | null) => void
  /** Solo modo checkout: confirma y crea la venta. */
  onConfirm?: () => void
  /** Solo modo view: reimprime el ticket existente (no crea compra). */
  onReprint?: () => void
  /** Modo view opcional: repite la jugada cargándola al carrito. */
  onRepeat?: () => void
  /** Modo view opcional: anula el ticket vendido. */
  onDelete?: () => void
  /** Ref para capturar el boleto como imagen. */
  captureRef?: React.RefObject<HTMLDivElement | null>
  /** Configuración para metadata de compra (vendedor, puesto) */
  vendorName?: string
  terminalName?: string
}

/**
 * Página completa de verificación de compra (reemplaza el modal anterior).
 *
 * Dos modos:
 * - checkout: muestra el carrito y confirma la venta (flujo de compra).
 * - view: muestra un ticket YA VENDIDO (reportes); IMPRIMIR solo reimprime,
 *   nunca genera una nueva compra.
 *
 * Muestra hasta 15 jugadas simultáneamente sin scroll vertical, agrupando
 * la información común (juego/sorteo) una sola vez.
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
  ticket,
  currency,
  isProcessing,
  onBack,
  onShare,
  onConfirm,
  onReprint,
  onRepeat,
  onDelete,
  captureRef,
  vendorName,
  terminalName,
}: PurchaseVerificationProps) {
  const isViewMode = Boolean(ticket)

  // Fuente de datos según modo
  const items = useMemo(() => {
    if (ticket?.items) {
      return ticket.items.map((item) => ({
        id: item.id,
        number: item.number,
        amount: item.amount,
        multiplier: item.game?.multiplier ?? 70,
        gameName: item.game?.name || 'Juego',
        scheduleName: item.schedule || '',
      }))
    }
    return (cart || []).map((item) => ({
      id: item.id,
      number: item.number,
      amount: item.amount,
      multiplier: item.multiplier ?? 70,
      gameName: item.gameName,
      scheduleName: item.scheduleName || item.schedule || '',
    }))
  }, [cart, ticket])

  const total = useMemo(
    () => (ticket ? ticket.totalAmount : (cart || []).reduce((sum, item) => sum + item.amount, 0)),
    [cart, ticket]
  )

  // Metadata de compra (solo modo view con ticket)
  const purchaseMeta = useMemo(() => {
    if (!ticket) return null
    const firstItem = ticket.items?.[0]
    const gameName = firstItem?.game?.name || 'Juego'
    const scheduleName = firstItem?.schedule || firstItem?.game?.schedules?.[0]?.name || 'Sorteo'
    const ticketNumber = ticket.ticketNumber || 'N/A'
    const ticketDate = format(new Date(ticket.createdAt), "dd/MM/yyyy '·' hh:mm a", { locale: es })
    const clientName = ticket.client || '-'
    const finalVendorName = vendorName || 'Yamileth'
    const finalTerminalName = terminalName || '= J081 ='
    return { gameName, scheduleName, ticketNumber, ticketDate, clientName, vendorName: finalVendorName, terminalName: finalTerminalName }
  }, [ticket, vendorName, terminalName])

  // Información agrupada: si todas las jugadas comparten juego/sorteo, se
  // muestra una sola vez (no repetida en cada fila)
  const gameName = items[0]?.gameName || ''
  const scheduleName = items[0]?.scheduleName || ''
  const allSameGame = items.every((i) => i.gameName === gameName)
  const allSameSchedule = items.every((i) => i.scheduleName === scheduleName)
  const showContext = allSameGame || allSameSchedule

  // Android Back Button: regresa a la pantalla anterior conservando el estado
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

  const headerTitle = isViewMode ? `Ticket ${ticket?.ticketNumber || ''}` : 'Verificar compra'

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
            {headerTitle}
          </h1>
        </div>

        <Badge className="ml-auto bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] rounded-full px-2.5">
          {items.length}
        </Badge>
      </header>

      {/* Boleto capturable como imagen (ref) */}
      <div ref={captureRef} className="flex-1 min-h-0 flex flex-col bg-white">

        {/* Header context y metadata ahora dentro de la captura */}
        <div className="px-2 pt-2 pb-1 shrink-0">
          {isViewMode && purchaseMeta && (
            <div className="flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase leading-tight text-slate-600">
              <div>
                JUEGO: <span className="text-slate-900 font-black">{purchaseMeta.gameName}</span>
              </div>
              <div>
                SORTEO: <span className="text-slate-900 font-black">{purchaseMeta.scheduleName}</span>
              </div>
              <div>
                FECHA/HORA: <span className="text-slate-900 font-black">{purchaseMeta.ticketDate}</span>
              </div>
              <div>
                VENTA #: <span className="text-slate-900 font-mono font-black">{purchaseMeta.ticketNumber}</span>
              </div>
              <div>
                CLIENTE: <span className="text-slate-900 font-black">{purchaseMeta.clientName}</span>
              </div>
              <div>
                VENDEDOR: <span className="text-slate-900 font-black">{purchaseMeta.vendorName}</span>
              </div>
              <div>
                PUESTO: <span className="text-slate-900 font-black">{purchaseMeta.terminalName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lista compacta de jugadas: flex-1 para repartir el espacio vertical equitativamente */}
        <div className="flex-1 min-h-0 overflow-hidden px-2 flex flex-col border-t border-muted/30 pt-1">
          <div className="grid grid-cols-12 items-center gap-1 px-2 py-1.5 border-b border-muted/60 text-[9px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
            <div className="col-span-4 pl-1">NÚMERO</div>
            <div className="col-span-3 text-right">MONTO</div>
            <div className="col-span-5 text-right pr-1">PREMIO</div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {items.map((item) => {
              const prize = (item.amount || 0) * (item.multiplier || 0)

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center gap-0 px-1.5 py-0.5 border-b border-muted/30"
                >
                  <div className="col-span-4 flex items-center gap-1 min-w-0">
                    <span className="font-mono text-[13px] font-black text-slate-900 dark:text-slate-200 leading-none tracking-tight">
                      {item.number}
                    </span>

                    {!showContext && (
                      <span className="text-[7px] font-bold text-muted-foreground uppercase truncate">
                        {item.gameName}
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="font-mono text-[13px] font-black text-slate-900 dark:text-slate-200 leading-none tracking-tight">
                      {currency}{item.amount.toFixed(0)}
                    </span>
                  </div>

                  <div className="col-span-5 text-right pr-0.5">
                    <span className="font-mono text-[13px] font-black text-slate-900 dark:text-slate-200 leading-none tracking-tight">
                      {currency}{prize.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total fijo, siempre visible */}
        <div className="shrink-0 border-t-2 border-muted/60 px-4 py-2 flex items-center justify-between bg-muted/10">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Total
          </span>
          <span className="text-2xl font-black text-primary leading-none tracking-tighter">
            {currency}{total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Acciones: Imprimir primaria, secundarias compactas */}
      <div className="shrink-0 grid grid-cols-4 gap-1.5 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        <Button
          variant="outline"
          onClick={() => onShare(captureRef?.current ?? null)}
          disabled={isProcessing}
          className="h-11 min-w-0 rounded-xl font-black uppercase text-[8px] border-2 flex flex-col gap-0.5 px-1"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="truncate">Compartir</span>
        </Button>

        {isViewMode && onRepeat ? (
          <Button
            variant="secondary"
            onClick={onRepeat}
            disabled={isProcessing}
            className="h-11 min-w-0 rounded-xl font-black uppercase text-[8px] flex flex-col gap-0.5 px-1"
          >
            <Repeat className="h-4 w-4 shrink-0" />
            <span className="truncate">Repetir</span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isProcessing}
            className="h-11 min-w-0 rounded-xl font-black uppercase text-[8px] flex flex-col gap-0.5 px-1"
          >
            <Repeat className="h-4 w-4 shrink-0" />
            <span className="truncate">Repetir</span>
          </Button>
        )}

        <Button
          onClick={isViewMode ? onReprint : onConfirm}
          disabled={isProcessing || items.length === 0}
          className="h-11 min-w-0 rounded-xl font-black uppercase text-[8px] bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-all flex flex-col gap-0.5 px-1"
        >
          {isProcessing ? (
            <>
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              <span className="truncate">Procesando</span>
            </>
          ) : (
            <>
              <Printer className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {isViewMode ? 'Reimprimir' : 'Imprimir'}
              </span>
            </>
          )}
        </Button>

        {isViewMode && onDelete ? (
          <Button
            variant="ghost"
            className="h-11 w-full min-w-0 rounded-xl text-red-500 hover:bg-red-500/10 active:scale-95 transition-all flex flex-col gap-0.5 px-1"
            onClick={onDelete}
            aria-label="Anular ticket"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="text-[8px] font-black uppercase truncate">
              Anular
            </span>
          </Button>
        ) : (
          <div />
        )}
      </div>

      {/* Nota de confirmación */}
      <p className="shrink-0 text-center text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest pb-1 flex items-center justify-center gap-1">
        <Check className="h-3 w-3 text-primary" />
        {isViewMode ? 'Ticket ya vendido · Reimprimir no genera nueva compra' : 'Verifica el monto antes de generar el ticket'}
      </p>
    </div>
  )
}
