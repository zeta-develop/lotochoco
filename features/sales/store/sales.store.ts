'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../domain/types'
import type { Game, DrawSchedule } from '@/lib/types'

interface SalesState {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'id'>) => void
  removeFromCart: (id: string) => void
  updateAllCartItems: (updates: Partial<CartItem>) => void
  clearCart: () => void
  setCart: (cart: CartItem[]) => void
  
  selectedGame: Game | null
  setSelectedGame: (game: Game | null) => void
  selectedSchedule: DrawSchedule | null
  setSelectedSchedule: (schedule: DrawSchedule | null) => void
  
  getCartTotal: () => number
  getCartCount: () => number
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (item) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        set((state) => ({
          cart: [...state.cart, { ...item, id }]
        }))
      },
      removeFromCart: (id) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id)
        }))
      },
      updateAllCartItems: (updates) => {
        set((state) => ({
          cart: state.cart.map((item) => ({ ...item, ...updates }))
        }))
      },
      clearCart: () => set({ cart: [] }),
      setCart: (cart) => set({ cart }),
      
      selectedGame: null,
      setSelectedGame: (game) => set({ selectedGame: game }),
      selectedSchedule: null,
      setSelectedSchedule: (schedule) => set({ selectedSchedule: schedule }),
      
      getCartTotal: () => {
        return get().cart.reduce((sum, item) => sum + item.amount, 0)
      },
      getCartCount: () => get().cart.length
    }),
    {
      name: 'lottery-sales-storage',
      partialize: (state) => ({
        cart: state.cart
      })
    }
  )
)
