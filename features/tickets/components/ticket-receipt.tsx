"use client";

import { forwardRef, useEffect, useState } from "react";
import type { Ticket, TicketItem } from "@/lib/types";
import { formatTime12h } from '@/lib/utils';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import QRCode from "qrcode";

interface TicketReceiptProps {
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] };
  settings?: Record<string, string>;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings }, ref) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

    useEffect(() => {
      const code = ticket?.ticketNumber || 'LOTERIA'
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
        .catch((err) => console.error('Error generating QR code in receipt:', err))
    }, [ticket?.ticketNumber])

    const businessName = settings?.businessName || 'LOTERIA'
    const currency = settings?.currency || 'C$'
    const firstItem = ticket.items?.[0]
    const gameName = firstItem?.game?.name || 'Tica'
    const rawSchedule = (firstItem as any)?.scheduleName || firstItem?.schedule || '7:30 pm'
    let scheduleName = rawSchedule
    try {
      const formattedSch = formatTime12h(rawSchedule)
      if (formattedSch) scheduleName = formattedSch.toLowerCase()
    } catch {
      scheduleName = rawSchedule
    }

    let formattedDate = ''
    try {
      const d = ticket.createdAt ? new Date(ticket.createdAt) : new Date()
      formattedDate = format(d, 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
    } catch {
      formattedDate = format(new Date(), 'dd/MM/yyyy h:mm a', { locale: es }).toLowerCase()
    }

    const paperWidth = settings?.ticketWidth === '80mm' ? '300px' : '260px'

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 font-mono mx-auto w-full max-w-[320px] print:w-[58mm] print:p-0"
      >
        <div 
          style={{ width: paperWidth }}
          className="p-3 bg-white text-black mx-auto print:p-0 print:w-full font-mono text-[12px] leading-snug"
        >
          {/* Metadata (Centrado, directo al Folio) */}
          <div className="text-center space-y-0.5 text-xs text-black font-mono pt-1">
            <div>Folio: {ticket.ticketNumber}</div>
            <div>Fecha: {formattedDate}</div>
            <div>Juego: {gameName}</div>
            <div>Sorteo: {scheduleName}</div>
            {ticket.client ? (
              <div>Cliente: {ticket.client}</div>
            ) : null}
            <div>Puesto: {(settings?.terminalId || settings?.terminalName || 'J081').replace(/^=\s*|\s*=$/g, '')}</div>
            <div>Vendedor: {settings?.vendorName || 'Yamileth'}</div>
          </div>

          {/* Separator */}
          <div className="text-center text-[11px] text-gray-500 tracking-tighter select-none font-mono my-1 overflow-hidden">
            --------------------------------
          </div>

          {/* Column Header */}
          <div className="flex justify-between items-center text-xs font-bold text-black font-mono px-1">
            <span className="w-1/3 text-left">Apuesta</span>
            <span className="w-1/3 text-center">Monto</span>
            <span className="w-1/3 text-right">Premio</span>
          </div>

          {/* Separator */}
          <div className="text-center text-[11px] text-gray-500 tracking-tighter select-none font-mono my-1 overflow-hidden">
            --------------------------------
          </div>

          {/* Items */}
          <div className="space-y-0.5 my-1 px-1">
            {ticket.items.map((item, index) => {
              const multiplier = item.game?.multiplier || 70
              const prize = item.amount * multiplier
              return (
                <div key={index} className="flex justify-between items-center text-xs font-mono text-black font-bold">
                  <span className="w-1/3 text-left">{item.number}</span>
                  <span className="w-1/3 text-center">{item.amount.toFixed(0)}</span>
                  <span className="w-1/3 text-right">{prize.toFixed(0)}</span>
                </div>
              )
            })}
          </div>

          {/* Separator */}
          <div className="text-center text-[11px] text-gray-500 tracking-tighter select-none font-mono my-1 overflow-hidden">
            --------------------------------
          </div>

          {/* Total */}
          <div className="text-center font-bold text-sm text-black font-mono my-1 tracking-wide">
            TOTAL: {currency} {ticket.totalAmount % 1 === 0 ? ticket.totalAmount.toFixed(0) : ticket.totalAmount.toFixed(2)}
          </div>

          {/* Legal / Disclaimers */}
          <div className="text-center text-[11px] leading-snug text-gray-800 font-mono space-y-0.5 my-1">
            <div>Valido para 1 sorteo</div>
            <div>Por favor revise su boleto</div>
            <div>Premio valido por 7 dias</div>
          </div>

          {/* Native QR Code Display */}
          {qrCodeUrl && (
            <div className="flex justify-center my-2">
              <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

TicketReceipt.displayName = "TicketReceipt";
