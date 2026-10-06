'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, SaleRequest } from '../domain/types'
import type { Game, DrawSchedule } from '@/lib/types'

interface SalesState {
  cart: CartItem[]
  pendingSale: (SaleRequest & { companyId: string }) | null
  beginSale: (request: SaleRequest, companyId: string) => SaleRequest
  completeSale: () => void
  addToCart: (item: Omit<CartItem, 'id'>) => void
  removeFromCart: (id: string) => void
  updateAllCartItems: (updates: Partial<CartItem>) => void
  clearCart: () => void
  setCart: (cart: CartItem[]) => void
  
  selectedGame: Game | null
  setSelectedGame: (game: Game | null) => void
  selectedSchedule: DrawSchedule | null
  setSelectedSchedule: (schedule: DrawSchedule | null) => void
  
  isLocked: boolean
  setLocked: (locked: boolean) => void
  
  getCartTotal: () => number
  getCartCount: () => number
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      cart: [],
      pendingSale: null,
      beginSale: (request, companyId) => {
        const pending = get().pendingSale
        if (pending) {
          if (pending.companyId !== companyId) throw new Error('Recupera la venta pendiente en su empresa original')
          return pending
        }
        const sale = { ...request, items: request.items.map(item => ({ ...item })), requestId: crypto.randomUUID(), companyId }
        set({ pendingSale: sale })
        return sale
      },
      completeSale: () => set({ cart: [], pendingSale: null, isLocked: false }),
      addToCart: (item) => {
        if (get().pendingSale) return
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        set((state) => ({
          cart: [...state.cart, { ...item, id }]
        }))
      },
      removeFromCart: (id) => {
        if (get().pendingSale) return
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id)
        }))
      },
      updateAllCartItems: (updates) => {
        if (get().pendingSale) return
        set((state) => ({
          cart: state.cart.map((item) => ({ ...item, ...updates }))
        }))
      },
      clearCart: () => { if (!get().pendingSale) set({ cart: [], isLocked: false }) },
      setCart: (cart) => { if (!get().pendingSale) set({ cart }) },
      
      selectedGame: null,
      setSelectedGame: (game) => set({ selectedGame: game }),
      selectedSchedule: null,
      setSelectedSchedule: (schedule) => set({ selectedSchedule: schedule }),
      
      isLocked: false,
      setLocked: (locked) => set({ isLocked: locked }),
      
      getCartTotal: () => {
        return get().cart.reduce((sum, item) => sum + item.amount, 0)
      },
      getCartCount: () => get().cart.length
    }),
    {
      version: 1, // Discard legacy device-wide account data on upgrade.
      name: 'lottery-sales-storage',
      partialize: (state) => ({
        cart: state.cart,
        pendingSale: state.pendingSale
      })
    }
  )
)
