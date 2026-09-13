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
import { useSettingsManager } from "@/features/settings/hooks/use-settings-manager"
import { TicketBodyView } from "@/features/settings/components/TicketBodyView"
import { generateTicketQrHash } from "@/features/settings/utils/ticket-template"

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
  const { settings } = useSettingsManager()
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
    const code = generateTicketQrHash(ticket)
    QRCode.toDataURL(code, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.error('Error generating QR code in preview:', err))
  }, [ticket])

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
          {/* Ticket Content - Réplica exacta de papel térmico usando la plantilla configurada */}
          <div ref={ticketRef} className="p-4 overflow-y-auto font-mono text-[12px] leading-tight bg-white text-black select-text">
            <TicketBodyView 
              template={settings.ticketTemplate}
              ticket={ticket}
              settings={{
                ...settings,
                businessName,
                currency,
                ticketMessage
              }}
              qrCodeUrl={qrCodeUrl}
            />
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
