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
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-background pb-[env(safe-area-inset-bottom,0px)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#060e20] border-r border-[#1e293b] text-slate-100 transition-transform duration-300 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#1e293b] px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10b981] text-slate-950 font-black text-sm">
              L
            </div>
            <span className="font-bold text-sm truncate text-white">
              {settings.businessName || 'LOTOCHOCO POS'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cash status */}
        <div className={cn(
          "mx-3 mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono font-bold border",
          isCashOpen 
            ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30" 
            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
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
          {modules.map((module) => {
            const isActive = activeModule === module.id
            return (
              <Button
                key={module.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-xl font-bold text-sm transition-all",
                  isActive 
                    ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 active-glow" 
                    : "text-slate-300 hover:bg-[#131b2e] hover:text-white"
                )}
                onClick={() => {
                  onModuleChange(module.id)
                  setSidebarOpen(false)
                }}
              >
                <module.icon className={cn("h-5 w-5", isActive ? "text-[#10b981]" : "text-slate-400")} />
                {module.label}
              </Button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#1e293b] p-3">
          <div className="rounded-xl bg-[#0b1326] border border-[#1e293b] px-3 py-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">Terminal POS Loteria</div>
            {/* Version Info */} <VersionInfo />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-hidden min-h-[100dvh]">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0b1326] px-3 md:px-4 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-300 hover:text-white hover:bg-[#131b2e]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] font-black text-xs">
                L
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs md:text-sm text-slate-100 tracking-tight truncate">
                    {settings.businessName || 'LOTOCHOCO'} • {settings.terminalNumber || 'POS-J081'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-dot"></span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <span>Papel OK</span>
                  <span>•</span>
                  <span className="text-[#10b981]">Offline-Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right status & actions */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border",
              isCashOpen 
                ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", isCashOpen ? "bg-[#10b981]" : "bg-amber-400")} />
              <span>{isCashOpen ? "Caja Abierta" : "Caja Cerrada"}</span>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
              className={cn("text-slate-400 hover:text-white hover:bg-[#131b2e] h-9 w-9", isRefreshing && "animate-spin")}
              title="Sincronizar / Refrescar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden p-2 sm:p-4 relative pb-20 lg:pb-4 bg-[#0b1326] text-slate-100">
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#10b981]/20 overflow-hidden z-50">
              <div className="h-full bg-[#10b981] animate-pulse w-full" />
            </div>
          )}
          {children}
        </main>

        {/* Mobile bottom navigation bar for 1-hand touch POS ergonomics */}
        <nav className="fixed bottom-0 left-0 w-full max-w-[100vw] z-40 flex lg:hidden justify-around items-center px-1 py-1.5 bg-[#060e20] border-t border-[#1e293b] backdrop-blur-lg">
          <button
            onClick={() => onModuleChange('pos')}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-transform active:scale-95",
              activeModule === 'pos' 
                ? "bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/30 active-glow" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Venta</span>
          </button>

          <button
            onClick={() => onModuleChange('results')}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-transform active:scale-95",
              activeModule === 'results' 
                ? "bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/30 active-glow" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Resultados</span>
          </button>

          <button
            onClick={() => onModuleChange('cash')}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-transform active:scale-95",
              activeModule === 'cash' 
                ? "bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/30 active-glow" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Caja</span>
          </button>

          <button
            onClick={() => onModuleChange('reports')}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-transform active:scale-95",
              activeModule === 'reports' 
                ? "bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/30 active-glow" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Reportes</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            type="button"
            className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 rounded-xl transition-transform active:scale-95"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Más</span>
          </button>
        </nav>
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
