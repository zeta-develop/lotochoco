'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSettingsManager } from '@/features/settings/hooks/use-settings-manager'
import { useCurrentSession } from '@/features/cash/hooks/use-cash-manager'
import { dbEvents } from '@/lib/events'
import {
  LayoutDashboard,
  ShoppingCart,
  Gamepad2,
  Trophy,
  FileText,
  Wallet,
  Pyramid,
  Settings,
  Menu,
  X,
  DollarSign,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export type Module = 
  | 'dashboard'
  | 'pos'
  | 'games'
  | 'results'
  | 'winners'
  | 'reports'
  | 'cash'
  | 'pyramid'
  | 'settings'

interface MainLayoutProps {
  children: React.ReactNode
  activeModule: Module
  onModuleChange: (module: Module) => void
}

const modules = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos' as const, label: 'Venta', icon: ShoppingCart },
  { id: 'games' as const, label: 'Juegos', icon: Gamepad2 },
  { id: 'results' as const, label: 'Resultados', icon: Trophy },
  { id: 'winners' as const, label: 'Ganadores', icon: DollarSign },
  { id: 'reports' as const, label: 'Reportes', icon: FileText },
  { id: 'cash' as const, label: 'Caja', icon: Wallet },
  { id: 'pyramid' as const, label: 'Piramide', icon: Pyramid },
  { id: 'settings' as const, label: 'Config', icon: Settings },
]

export function MainLayout({ children, activeModule, onModuleChange }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { settings } = useSettingsManager()
  const { isOpen: isCashOpen } = useCurrentSession()

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true)
    // Emitir eventos para que todos los hooks activos refresquen sus datos
    dbEvents.emit('tickets:changed')
    dbEvents.emit('results:changed')
    dbEvents.emit('winners:changed')
    dbEvents.emit('games:changed')
    dbEvents.emit('cash:changed')
    dbEvents.emit('settings:changed')
    
    // Pequeña pausa para feedback visual
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsRefreshing(false)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r transition-transform duration-300 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              L
            </div>
            <span className="font-semibold text-sm truncate">
              {settings.businessName || 'Loteria POS'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú lateral"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cash status */}
        <div className={cn(
          "mx-3 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          isCashOpen 
            ? "bg-green-500/10 text-green-600 dark:text-green-400" 
            : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
        )}>
          {isCashOpen ? (
            <>
              <Wallet className="h-4 w-4" />
              <span>Caja Abierta</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Caja Cerrada</span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {modules.map((module) => (
            <Button
              key={module.id}
              variant={activeModule === module.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3",
                activeModule === module.id && "bg-primary/10 text-primary"
              )}
              onClick={() => {
                onModuleChange(module.id)
                setSidebarOpen(false)
              }}
            >
              <module.icon className="h-5 w-5" />
              {module.label}
            </Button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <div className="font-medium">Sistema POS Loteria</div>
            {/* Version Info */} <VersionInfo />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú lateral"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold">
            {modules.find(m => m.id === activeModule)?.label}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
              className={cn("text-muted-foreground", isRefreshing && "animate-spin")}
              aria-label="Actualizar datos"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString('es-NI', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 relative">
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-50">
              <div className="h-full bg-primary animate-pulse w-full" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

function VersionInfo() {
  const { currentVersion, latestVersion, isUpdateAvailable } = require('@/features/updater/hooks/use-updater').useUpdater();

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-2">
        <span>v{currentVersion}</span>
        <span className="text-[10px] bg-green-500/20 text-green-600 px-1.5 rounded-full">Offline</span>
      </div>
      {isUpdateAvailable && (
        <div className="text-[10px] text-primary font-medium animate-pulse">
          v{latestVersion} disponible!
        </div>
      )}
    </div>
  );
}
