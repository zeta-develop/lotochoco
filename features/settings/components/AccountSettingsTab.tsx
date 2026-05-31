'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { signOut } from '@/lib/supabase/auth'
import { LogOut } from 'lucide-react'

export function AccountSettingsTab() {
  const { user } = useAuthStore()

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
