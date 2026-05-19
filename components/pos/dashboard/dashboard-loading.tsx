'use client'

export function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando Tablero...</p>
      </div>
    </div>
  )
}
