'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { usePOSSale } from '@/hooks/use-pos-sale'
import { SaleEntryCard } from '@/components/pos/sale-entry-card'
import { SaleCartCard } from '@/components/pos/sale-cart-card'
import { SaleConfirmDialog } from '@/components/pos/sale-confirm-dialog'
import { SaleSuccessDialog } from '@/components/pos/sale-success-dialog'

export function POSSale() {
  const {
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
  } = usePOSSale()

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando Juegos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2">Terminal de Venta</Badge>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Nueva Jugada</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Registro de tickets y ventas directas</p>
        </div>
      </div>

      {!isCashOpen && (
        <div className="p-5 bg-orange-500/10 border-2 border-orange-500/20 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="bg-orange-500 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white"><AlertCircle /></div>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400 leading-relaxed my-auto">
            La caja registradora está <span className="font-black uppercase tracking-widest">cerrada</span>. Abre la caja en el panel de Estado para poder registrar ventas.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <SaleEntryCard
            games={games}
            selectedGame={selectedGame}
            selectedSchedule={selectedSchedule}
            number={number}
            amount={amount}
            client={client}
            currency={currency}
            isCashOpen={isCashOpen}
            formatTime12h={formatTime12h}
            onGameSelect={handleGameSelect}
            onScheduleSelect={setSelectedSchedule}
            onNumberChange={setNumber}
            onAmountChange={setAmount}
            onClientChange={setClient}
            onAddToCart={handleAddToCart}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SaleCartCard
            cart={cart}
            currency={currency}
            cartTotal={getCartTotal()}
            isCashOpen={isCashOpen}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onOpenConfirm={() => setShowConfirmDialog(true)}
          />
        </div>
      </div>

      <SaleConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        cartCount={cart.length}
        cartTotal={getCartTotal()}
        currency={currency}
        isProcessing={isProcessing}
        onConfirm={handleConfirmSale}
      />

      <SaleSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        ticket={lastTicket}
        currency={currency}
        onShare={handleShare}
        onPrint={handlePrint}
      />
    </div>
  )
}
