import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, X, Share2, Loader2 } from "lucide-react"
import type { Ticket, TicketItem, Game } from "@/lib/types"
import { formatTime12h } from '@/lib/utils'
import { printerService } from "@/features/settings/services/printer.service"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import QRCode from "qrcode"

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
  const [isSharing, setIsSharing] = useState(false)
  const ticketRef = useRef<HTMLDivElement | null>(null)

  const handleShare = async () => {
    try {
      setIsSharing(true)
      const result = await printerService.shareTicketImage(
        ticket as any,
        {
          businessName,
          currency,
          ticketMessage
        },
        ticketRef.current
      )
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Error al compartir ticket"
        })
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error inesperado al compartir"
      })
    } finally {
      setIsSharing(false)
    }
  }

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
      .catch((err) => console.error('Error generating QR code in preview:', err))
  }, [ticket?.ticketNumber])

  const firstItem = ticket.items?.[0]
  const gameName = firstItem?.game?.name || 'Tica'
  const rawSchedule = firstItem?.schedule || '7:30 pm'
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-[310px] bg-white text-black shadow-2xl border-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <CardContent className="p-0 flex flex-col max-h-[85vh]">
          {/* Ticket Content - Réplica exacta de papel térmico */}
          <div ref={ticketRef} className="p-4 overflow-y-auto font-mono text-[12px] leading-tight bg-white text-black select-text">
            {/* Metadata (Centrado, directo al Folio) */}
            <div className="text-center space-y-0.5 text-xs text-black font-mono pt-1">
              <div>Folio: {ticket.ticketNumber}</div>
              <div>Fecha: {formattedDate}</div>
              <div>Juego: {gameName}</div>
              <div>Sorteo: {scheduleName}</div>
              {ticket.client ? (
                <div>Cliente: {ticket.client}</div>
              ) : null}
              <div>Puesto: J081</div>
              <div>Vendedor: Yamileth</div>
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

            {/* Items (Más anchos y en Negrita) */}
            <div className="space-y-0.5 my-1 px-1">
              {ticket.items.map((item, index) => {
                const multiplier = item.game?.multiplier || 70
                const prize = item.amount * multiplier
                return (
                  <div key={index} className="flex justify-between items-center text-sm font-mono text-black font-black">
                    <span className="w-1/3 text-left tracking-widest">{item.number}</span>
                    <span className="w-1/3 text-center tracking-wider">{item.amount.toFixed(0)}</span>
                    <span className="w-1/3 text-right tracking-wider">{prize.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>

            {/* Separator */}
            <div className="text-center text-[11px] text-gray-500 tracking-tighter select-none font-mono my-1 overflow-hidden">
              --------------------------------
            </div>

            {/* Total (Más ancho y en Negrita) */}
            <div className="text-center font-black text-base text-black font-mono my-1 tracking-wider">
              TOTAL: {currency} {ticket.totalAmount % 1 === 0 ? ticket.totalAmount.toFixed(0) : ticket.totalAmount.toFixed(2)}
            </div>

            {/* Legal / Disclaimers */}
            <div className="text-center text-[11px] leading-snug text-gray-800 font-mono space-y-0.5 my-1">
              <div>Valido para 1 sorteo</div>
              <div>Por favor revise su boleto</div>
              <div>Premio valido por 7 dias</div>
            </div>

            {/* Native QR Code Display */}
            {qrCodeUrl ? (
              <div className="flex justify-center my-2">
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 object-contain" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto my-2 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                Cargando QR...
              </div>
            )}
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
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Compartir
            </Button>
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
