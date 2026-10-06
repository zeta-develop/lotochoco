'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { signOut } from '@/lib/supabase/auth'
import { useSalesStore } from '@/features/sales/store/sales.store'
import { useCompany } from '../hooks/use-company'
import { LogOut } from 'lucide-react'

export function AccountSettingsTab() {
  const { user, selectedCompanyId } = useAuthStore()
  const { companies, selectCompany } = useCompany()
  const pendingSale = useSalesStore(state => state.pendingSale)

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
      <CardHeader className="relative">
        <CardTitle>Tu Cuenta</CardTitle>
        <CardDescription>
          Sesión actual en la nube de Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        <div className="p-4 border border-white/10 rounded-xl bg-muted/20 backdrop-blur-sm space-y-4 shadow-inner">
          <p className="text-sm font-semibold">Usuario conectado:</p>
          <p className="text-muted-foreground break-all">{user?.email || 'No disponible'}</p>
          {companies.length > 1 && (
            <div className="space-y-2">
              <label htmlFor="active-company" className="text-sm font-semibold">Empresa activa</label>
              <select id="active-company" className="w-full rounded border bg-background p-2"
                disabled={!!pendingSale} value={selectedCompanyId ?? ''} onChange={event => selectCompany(event.target.value)}>
                <option value="" disabled>Selecciona una empresa</option>
                {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              {pendingSale && <p className="text-sm">Resuelve la venta pendiente antes de cambiar de empresa.</p>}
            </div>
          )}
          <div className="pt-2">
            <Button variant="destructive" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
