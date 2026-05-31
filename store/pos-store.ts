'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Game, DrawSchedule, CashSession, Setting } from '@/lib/types'

interface POSState {
  // Cart
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'id'>) => void
  removeFromCart: (id: string) => void
  updateCartItem: (id: string, updates: Partial<CartItem>) => void
  updateAllCartItems: (updates: Partial<CartItem>) => void
  clearCart: () => void
  setCart: (cart: CartItem[]) => void
  
  // Games cache
  games: Game[]
  setGames: (games: Game[]) => void
  
  // Schedules cache
  schedules: DrawSchedule[]
  setSchedules: (schedules: DrawSchedule[]) => void
  
  // Current session
  currentSession: CashSession | null
  setCurrentSession: (session: CashSession | null) => void
  
  // Settings
  settings: Record<string, string>
  setSettings: (settings: Record<string, string>) => void
  updateSetting: (key: string, value: string) => void
  
  // UI State
  selectedGame: Game | null
  setSelectedGame: (game: Game | null) => void
  selectedSchedule: DrawSchedule | null
  setSelectedSchedule: (schedule: DrawSchedule | null) => void
  
  // Computed
  getCartTotal: () => number
  getCartCount: () => number
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      // Cart
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
      updateCartItem: (id, updates) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          )
        }))
      },
      updateAllCartItems: (updates) => {
        set((state) => ({
          cart: state.cart.map((item) => ({ ...item, ...updates }))
        }))
      },
      clearCart: () => set({ cart: [] }),
      setCart: (cart) => set({ cart }),
      
      // Games
      games: [],
      setGames: (games) => set({ games }),
      
      // Schedules
      schedules: [],
      setSchedules: (schedules) => set({ schedules }),
      
      // Session
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),
      
      // Settings
      settings: {
        businessName: 'Lotería La Fortuna',
        currency: 'C$',
        ticketMessage: '¡Buena suerte!',
        printerType: 'network',
        printerAddress: '192.168.1.100',
        darkMode: 'false'
      },
      setSettings: (settings) => set({ settings }),
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }))
      },
      
      // UI State
      selectedGame: null,
      setSelectedGame: (game) => set({ selectedGame: game }),
      selectedSchedule: null,
      setSelectedSchedule: (schedule) => set({ selectedSchedule: schedule }),
      
      // Computed
      getCartTotal: () => {
        return get().cart.reduce((sum, item) => sum + item.amount, 0)
      },
      getCartCount: () => get().cart.length
    }),
    {
      name: 'lottery-pos-storage',
      partialize: (state) => ({
        settings: state.settings,
        cart: state.cart
      })
    }
  )
)
