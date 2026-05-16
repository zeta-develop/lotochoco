"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, X } from "lucide-react"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm bg-white text-black" onClick={(event) => event.stopPropagation()}>
        <CardContent className="p-0">
          {/* Ticket Content - Simula papel termico */}
          <div className="p-4 font-mono text-sm space-y-3">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3">
              <h2 className="text-lg font-bold">{businessName}</h2>
              <p className="text-xs text-gray-600">Sistema de Loteria</p>
            </div>

            {/* Ticket Info */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Ticket:</span>
                <span className="font-bold">{ticket.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400" />

            {/* Items */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-bold border-b pb-1">
                <span className="col-span-4">JUEGO</span>
                <span className="col-span-3 text-center">NUM</span>
                <span className="col-span-2 text-center">HOR</span>
                <span className="col-span-3 text-right">MONTO</span>
              </div>
              
              {ticket.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 text-xs">
                  <span className="col-span-4 truncate">{item.game.name}</span>
                  <span className="col-span-3 text-center font-bold">{item.number}</span>
                  <span className="col-span-2 text-center text-gray-600">{item.drawTime}</span>
                  <span className="col-span-3 text-right">{currency}{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400" />

            {/* Total */}
            <div className="flex justify-between text-base font-bold">
              <span>TOTAL:</span>
              <span>{currency}{ticket.total.toFixed(2)}</span>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400" />

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 space-y-1">
              <p>{ticketMessage}</p>
              <p className="font-bold">*** CONSERVE SU TICKET ***</p>
            </div>

            {/* Barcode simulation */}
            <div className="text-center pt-2">
              <div className="inline-block">
                <div className="flex gap-px">
                  {ticket.ticketNumber.split("").map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-black" 
                      style={{ 
                        width: Math.random() > 0.5 ? 2 : 1,
                        height: 30 
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1">{ticket.ticketNumber}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 p-4 bg-gray-100 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            <Button
              className="flex-1"
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
