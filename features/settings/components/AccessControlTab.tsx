'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/auth-store'
import { useCompanyAccess } from '../hooks/use-company-access'

export function AccessControlTab() {
  const { company, isAdmin, isLoading, error, members, updateMemberRole } = useCompanyAccess()
  const user = useAuthStore(state => state.user)
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null)
  const isOwner = company?.role === 'owner'
  const roles = isOwner ? ['user', 'manager', 'admin'] : ['user', 'manager']

  const changeRole = async (userId: string, role: string) => {
    setSavingRoleUserId(userId)
    try {
      const result = await updateMemberRole(userId, role)
      toast(result.success ? { title: 'Rol actualizado' } : { variant: 'destructive', title: result.message })
    } finally {
      setSavingRoleUserId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles de la empresa</CardTitle>
        <CardDescription>
          Los miembros comparten los datos de la empresa activa. Los roles controlan las operaciones permitidas;
          no existe una restricción de ventas por vendedor.
        </CardDescription>
        <Badge variant="outline" className="w-fit gap-1">
          <ShieldCheck className="h-3 w-3" /> {company?.name || 'Empresa'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isAdmin ? <p>Solo propietarios y administradores pueden cambiar roles.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {isAdmin && members.map(member => (
          <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded border p-4">
            <div>
              <p>{member.displayName || member.email || member.userId}</p>
              <Badge variant="outline">{member.role}</Badge>
            </div>
            <Select value={member.role} onValueChange={role => { void changeRole(member.userId, role) }}
              disabled={isLoading || savingRoleUserId !== null || member.userId === user?.id || member.role === 'owner' || (!isOwner && member.role === 'admin')}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                {roles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
