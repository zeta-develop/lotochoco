'use client'

import { useEffect, useState } from 'react'
import type { Game, Ticket as AppTicket, TicketItem } from '@/lib/types'
import { usePOSStore } from '@/store/pos-store'
import { useGames } from '@/hooks/use-games'
import { useTickets } from '@/hooks/use-tickets'
import { useSettings } from '@/hooks/use-settings'
import { useCurrentSession } from '@/hooks/use-cash'
import { printerService } from '@/services/printer'
import { formatTime12h } from '@/lib/utils'
import { toast } from 'sonner'

export function usePOSSale() {
  const { games, isLoading: gamesLoading } = useGames()
  const { createTicket } = useTickets()
  const { settings } = useSettings()
  const { isOpen: isCashOpen } = useCurrentSession()

  const {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    selectedGame,
    setSelectedGame,
    selectedSchedule,
    setSelectedSchedule,
  } = usePOSStore()

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState(20)
  const [client, setClient] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastTicket, setLastTicket] = useState<AppTicket | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0])
      setSelectedSchedule(games[0].schedules?.[0] || null)
    }
  }, [games, selectedGame, setSelectedGame, setSelectedSchedule])

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game)
    setSelectedSchedule(game.schedules?.[0] || null)
  }

  const handleAddToCart = () => {
    if (!selectedGame || !selectedSchedule || !number || amount <= 0) {
      toast.error('Completa todos los campos')
      return
    }

    if (number.length !== selectedGame.digitCount) {
      toast.error(`El número debe tener ${selectedGame.digitCount} dígito(s)`)
      return
    }

    addToCart({
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      number: number.padStart(selectedGame.digitCount, '0'),
      amount,
      schedule: selectedSchedule.time,
      scheduleName: selectedSchedule.name,
      multiplier: selectedGame.multiplier,
      client: client || undefined,
    })

    setNumber('')
    toast.success('Jugada agregada')
  }

  const handleConfirmSale = async () => {
    if (!isCashOpen) {
      toast.error('Debes abrir la caja primero')
      return
    }

    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    setIsProcessing(true)

    try {
      const ticket = await createTicket(cart)
      setLastTicket(ticket)
      clearCart()
      setShowConfirmDialog(false)
      setShowSuccessDialog(true)
      toast.success('Venta completada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar venta')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = async () => {
    if (!lastTicket) return

    const result = await printerService.printTicket(
      lastTicket as AppTicket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
      settings
    )
    if (!result.success) {
      toast.error(result.message || 'Error al imprimir')
      return
    }

    toast.success(result.message || 'Impresión iniciada')
  }

  const handleShare = async () => {
    if (!lastTicket) return
    toast.info('Generando PDF...')
    const result = await printerService.shareTicketPDF(
      lastTicket as AppTicket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] },
      settings
    )
    if (!result.success) toast.error(result.message)
  }

  const currency = settings.currency || 'C$'

  return {
    games,
    gamesLoading,
    isCashOpen,
    currency,
    cart,
    selectedGame,
    selectedSchedule,
    number,
    amount,
    client,
    showConfirmDialog,
    showSuccessDialog,
    lastTicket,
    isProcessing,
    setNumber,
    setAmount,
    setClient,
    setShowConfirmDialog,
    setShowSuccessDialog,
    handleGameSelect,
    handleAddToCart,
    handleConfirmSale,
    handlePrint,
    handleShare,
    removeFromCart,
    clearCart,
    getCartTotal,
    setSelectedSchedule,
    formatTime12h,
  }
}