'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import QRCode from 'qrcode'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Printer, Repeat, Share2, Trash2, ShieldCheck } from 'lucide-react'
import { formatTime12h } from '@/lib/utils'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { TicketBodyView } from '@/features/settings/components/TicketBodyView'
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

  const totalMaxPrize = useMemo(
    () => items.reduce((sum, item) => sum + (item.amount || 0) * (item.multiplier || 0), 0),
    [items]
  )

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  // Metadata de compra (formato exacto de recibo térmico)
  const purchaseMeta = useMemo(() => {
    const firstItem = items[0]
    const gameName = firstItem?.gameName || 'Tica'

    const rawSchedule = firstItem?.scheduleName || '7:30 pm'
    let scheduleName = rawSchedule
    try {
      const formatted = formatTime12h(rawSchedule)
      if (formatted) scheduleName = formatted.toLowerCase()
    } catch {
      scheduleName = rawSchedule
    }

    const ticketNumber = ticket?.ticketNumber || 'PREVIEW'

    let ticketDate = ''
    try {
      const d = ticket?.createdAt ? new Date(ticket.createdAt) : new Date()
      ticketDate = format(d, 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
    } catch {
      ticketDate = format(new Date(), 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
    }

    const clientName = ticket?.client?.trim() || ''
    const finalVendorName = vendorName || 'Yamileth'
    const finalTerminalName = terminalName || '= J081 ='
    return { gameName, scheduleName, ticketNumber, ticketDate, clientName, vendorName: finalVendorName, terminalName: finalTerminalName }
  }, [ticket, items, vendorName, terminalName])

  const { settings } = useSettingsManager()

  const currentTicketForView = useMemo(() => {
    return {
      id: ticket?.id || 'preview',
      ticketNumber: purchaseMeta.ticketNumber,
      createdAt: ticket?.createdAt || new Date().toISOString(),
      totalAmount: total,
      client: purchaseMeta.clientName,
      status: ticket?.status || 'active',
      items: items.map((i) => ({
        id: i.id,
        number: i.number,
        amount: i.amount,
        multiplier: i.multiplier || 70,
        gameName: i.gameName,
        scheduleName: i.scheduleName,
        game: { name: i.gameName, multiplier: i.multiplier || 70 } as any
      }))
    }
  }, [ticket, purchaseMeta, total, items])

  useEffect(() => {
    const code = purchaseMeta.ticketNumber || 'LOTERIA'
    QRCode.toDataURL(code, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.error('Error generating QR code:', err))
  }, [purchaseMeta.ticketNumber])

  // Información agrupada: si todas las jugadas comparten juego/sorteo
  const gameName = items[0]?.gameName || 'LOTERIA'
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

  const headerTitle = isViewMode ? `Ticket #${ticket?.ticketNumber || ''}` : 'Verificar compra'

  return (
    <div className="flex h-full min-h-0 w-full max-w-[100vw] flex-col bg-[#0b1326] text-slate-100 overflow-y-auto overflow-x-hidden">
      {/* Top Header / Modal Navigation */}
      <header className="sticky top-0 z-30 bg-[#060e20]/95 backdrop-blur-md px-3 py-2 flex items-center justify-between border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl bg-[#131b2e] hover:bg-[#1e293b] text-slate-300 hover:text-white active:scale-95 transition-transform"
            onClick={onBack}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-100 truncate">
                {headerTitle}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-[10px] font-black uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot"></span>
                {isViewMode ? 'Vendido' : 'En Curso'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Printer className="h-3 w-3 text-[#10b981]" />
              PT-210 Térmica
            </p>
          </div>
        </div>

        <Badge className="bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
          {items.length} {items.length === 1 ? 'Jugada' : 'Jugadas'}
        </Badge>
      </header>

      {/* Main Content: Thermal Ticket */}
      <main className="flex-1 w-full max-w-md mx-auto px-3 py-4 flex flex-col items-center">
        {/* Quick Status Banner */}
        <div className="w-full bg-[#131b2e] border border-[#1e293b] rounded-2xl p-3 mb-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                {isViewMode ? 'Transacción Confirmada' : 'Listo para emitir'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                #{purchaseMeta.ticketNumber}
              </span>
            </div>
          </div>
          <span className="font-mono text-lg font-black text-[#10b981]">
            {currency}{total.toFixed(2)}
          </span>
        </div>

        {/* REALISTIC THERMAL PAPER TICKET CARD */}
        <div className="w-full max-w-[290px] shadow-2xl relative filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]">
          {/* Serrated Top Edge */}
          <div className="w-full h-2.5 thermal-rip-top -mb-[1px]"></div>

          {/* Ticket Body matching exact user photo and template */}
          <div ref={captureRef} className="bg-[#ffffff] text-[#000000] px-4 py-3 font-mono text-[12px] leading-tight select-text">
            <TicketBodyView 
              template={settings.ticketTemplate}
              ticket={currentTicketForView}
              settings={{
                ...settings,
                terminalId: purchaseMeta.terminalName,
                vendorName: purchaseMeta.vendorName,
                currency
              }}
              qrCodeUrl={qrCodeUrl}
            />
          </div>

          {/* Serrated Bottom Edge */}
          <div className="w-full h-2.5 thermal-rip-bottom -mt-[1px]"></div>
        </div>

        {/* Copy footnote */}
        <p className="mt-3 text-center text-xs text-slate-400 font-mono">
          Copia de auditoría registrada localmente en SQLite DB
        </p>
      </main>

      {/* FIXED BOTTOM ACTIONS DOCK */}
      <footer className="sticky bottom-0 left-0 w-full z-40 bg-[#060e20]/95 backdrop-blur-lg border-t border-[#1e293b] px-3 pt-2 pb-4 shadow-2xl shrink-0">
        <div className="max-w-md mx-auto flex flex-col space-y-2">
          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => onShare(captureRef?.current ?? null)}
              disabled={isProcessing}
              className="h-11 bg-[#131b2e] hover:bg-[#1e293b] border-[#1e293b] text-cyan-400 hover:text-cyan-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <Share2 className="h-4 w-4" />
              <span>Compartir Imagen</span>
            </Button>

            {isViewMode && onRepeat ? (
              <Button
                variant="outline"
                onClick={onRepeat}
                disabled={isProcessing}
                className="h-11 bg-[#131b2e] hover:bg-[#1e293b] border-[#1e293b] text-amber-400 hover:text-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Repeat className="h-4 w-4" />
                <span>Repetir Jugada</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isProcessing}
                className="h-11 bg-[#131b2e] hover:bg-[#1e293b] border-[#1e293b] text-slate-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Repeat className="h-4 w-4" />
                <span>Modificar</span>
              </Button>
            )}
          </div>

          {/* Primary Action Button */}
          <Button
            onClick={isViewMode ? onReprint : onConfirm}
            disabled={isProcessing || items.length === 0}
            className="w-full h-14 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active-glow active:scale-98 transition-all shadow-lg"
          >
            {isProcessing ? (
              <>
                <span className="h-5 w-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>PROCESANDO VENTA...</span>
              </>
            ) : (
              <>
                <Printer className="h-5 w-5" />
                <span>{isViewMode ? 'REIMPRIMIR TICKET (PT-210)' : 'CONFIRMAR E IMPRIMIR'}</span>
              </>
            )}
          </Button>

          {/* Anular option if in view mode */}
          {isViewMode && onDelete && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onDelete}
                className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-500/10 transition-colors"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Anular Ticket</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Impresora lista
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

