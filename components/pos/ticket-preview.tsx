"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, X, Share2 } from "lucide-react"
import type { Ticket, TicketItem, Game } from "@/lib/types"

interface TicketPreviewProps {
  ticket: Ticket & { items: (TicketItem & { game: Game })[] }
  businessName?: string
  currency?: string
  ticketMessage?: string
  onPrint?: () => void
  onClose?: () => void
}

export function TicketPreview({ 
  ticket, 
  businessName = "LOTERIA EXPRESS",
  currency = "C$",
  ticketMessage = "Gracias por su compra. Conserve su ticket.",
  onPrint,
  onClose 
}: TicketPreviewProps) {
  useEffect(() => {
    if (!onClose) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("es-NI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-[320px] bg-white text-black shadow-2xl border-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <CardContent className="p-0 flex flex-col max-h-[85vh]">
          {/* Ticket Content - Simula papel termico */}
          <div className="p-5 overflow-y-auto" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            <div className="text-sm">
              {/* Header */}
              <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                <h2 className="text-xl font-bold uppercase leading-tight">{businessName}</h2>
                <p className="text-sm mt-1">Ticket de Loteria</p>
              </div>

              {/* Ticket Info */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>TICKET:</span>
                  <span className="font-bold">#{ticket.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Items */}
              <table className="w-full text-left text-sm mb-2">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-1 w-1/4 font-semibold">JUEGO</th>
                    <th className="py-1 w-1/4 text-center font-semibold">NUM</th>
                    <th className="py-1 w-1/4 text-right font-semibold">MONTO</th>
                    <th className="py-1 w-1/4 text-right font-semibold">PREMIO</th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.items.map((item, index) => {
                    const multiplier = item.game?.multiplier || 70;
                    const prize = item.amount * multiplier;
                    return (
                      <tr key={index} className="align-top">
                        <td className="py-1">
                          <div className="truncate pr-1">{item.game?.name}</div>
                          <div className="text-[10px] text-gray-600">{formatTime12h(item.schedule)}</div>
                        </td>
                        <td className="py-1 text-center font-bold text-base">
                          {item.number}
                        </td>
                        <td className="py-1 text-right">
                          {currency}{item.amount.toFixed(0)}
                        </td>
                        <td className="py-1 text-right font-semibold">
                          {currency}{prize.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Separator */}
              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Total */}
              <div className="flex justify-between text-lg font-bold my-3">
                <span>TOTAL:</span>
                <span>{currency}{ticket.totalAmount.toFixed(2)}</span>
              </div>

              {/* Separator */}
              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Footer */}
              <div className="text-center text-sm space-y-2 mt-4">
                <p className="font-semibold">{ticketMessage}</p>

                {/* Barcode simulation */}
                <div className="flex justify-center mt-3 mb-1">
                  <div className="flex gap-px items-end h-12 w-full justify-center">
                    {ticket.ticketNumber.split("").map((char, i) => (
                      <div
                        key={i}
                        className="bg-black h-full"
                        style={{
                          width: (char.charCodeAt(0) % 3 === 0) ? "3px" : (char.charCodeAt(0) % 2 === 0) ? "2px" : "1px",
                          marginRight: "1px"
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs tracking-widest">{ticket.ticketNumber}</p>
                <p className="text-[11px] font-bold mt-4">*** CONSERVE SU TICKET ***</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 bg-gray-50 border-t">
            <Button
              variant="outline"
              className="flex-1 font-semibold"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            {onShare && (
              <Button
                variant="secondary"
                className="flex-1 font-semibold"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
            )}
            <Button
              className="flex-1 font-semibold bg-black text-white hover:bg-gray-800"
              onClick={onPrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
