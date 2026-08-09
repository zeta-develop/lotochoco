'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Users, UserRoundPlus, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/auth-store'
import { useCompanyAccess } from '../hooks/use-company-access'

const MANAGEABLE_ROLES = ['user', 'manager', 'admin']

export function AccessControlTab() {
  const {
    company,
    isAdmin,
    isLoading,
    error,
    members,
    accessGrants,
    memberById,
    updateMemberRole,
    grantAccess,
    revokeAccess,
  } = useCompanyAccess()
  const { user } = useAuthStore()

  const [managerUserId, setManagerUserId] = useState('')
  const [managedUserId, setManagedUserId] = useState('')
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!managerUserId && members.length > 0) {
      const defaultManager = members.find(member => member.role.toLowerCase() === 'manager') ?? members[0]
      setManagerUserId(defaultManager?.userId || '')
    }

    if (!managedUserId && members.length > 0) {
      const defaultManaged = members.find(member => member.userId !== managerUserId) ?? members[0]
      setManagedUserId(defaultManaged?.userId || '')
    }
  }, [managerUserId, managedUserId, members])

  useEffect(() => {
    setSelectedRoles(
      members.reduce<Record<string, string>>((accumulator, member) => {
        accumulator[member.userId] = member.role || 'user'
        return accumulator
      }, {})
    )
  }, [members])

  const managerCandidates = useMemo(() => {
    return members.filter(member => {
      const role = member.role.toLowerCase()
      return role === 'manager' || role === 'admin' || role === 'owner'
    })
  }, [members])

  const availableManagedUsers = useMemo(() => {
    return members.filter(member => member.userId !== managerUserId)
  }, [members, managerUserId])

  const handleRoleChange = async (userId: string, nextRole: string) => {
    setSavingRoleUserId(userId)
    const result = await updateMemberRole(userId, nextRole)
    setSavingRoleUserId(null)

    if (result.success) {
      toast({ title: 'Rol actualizado' })
      return
    }

    toast({ variant: 'destructive', title: result.message })
  }

  const handleGrantAccess = async () => {
    if (!managerUserId || !managedUserId) {
      toast({ variant: 'destructive', title: 'Selecciona un manager y un usuario' })
      return
    }

    if (managerUserId === managedUserId) {
      toast({ variant: 'destructive', title: 'El manager y el usuario no pueden ser el mismo' })
      return
    }

    const result = await grantAccess(managerUserId, managedUserId)
    if (result.success) {
      toast({ title: 'Acceso asignado' })
      return
    }

    toast({ variant: 'destructive', title: result.message })
  }

  const handleRevokeAccess = async (managerId: string, userId: string) => {
    const result = await revokeAccess(managerId, userId)
    if (result.success) {
      toast({ title: 'Acceso revocado' })
      return
    }

    toast({ variant: 'destructive', title: result.message })
  }

  if (!isAdmin) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <CardHeader className="relative">
          <CardTitle>Accesos y permisos</CardTitle>
          <CardDescription>
            Esta sección sólo está disponible para el administrador principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="rounded-xl border border-white/10 bg-muted/20 p-4 text-sm text-muted-foreground">
            El administrador puede asignar managers y decidir a qué usuarios puede ver cada uno.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Accesos por usuario</CardTitle>
              <CardDescription>
                Define qué manager puede administrar las ventas de cada vendedor.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> {company?.name || 'Empresa'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 relative">
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Manager</p>
              <Select value={managerUserId} onValueChange={setManagerUserId}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Selecciona un manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerCandidates.map(member => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.displayName || member.email || member.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Usuario con acceso</p>
              <Select value={managedUserId} onValueChange={setManagedUserId}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {availableManagedUsers.map(member => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.displayName || member.email || member.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={handleGrantAccess} disabled={isLoading}>
                <UserRoundPlus className="h-4 w-4 mr-2" />
                Asignar acceso
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <CardHeader className="relative">
          <CardTitle>Miembros de la empresa</CardTitle>
          <CardDescription>
            Cambia el rol de cada usuario para convertirlo en manager o devolverlo a usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 relative">
          {members.map(member => (
            <div key={member.userId} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-background/40 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{member.displayName || member.email || member.userId}</p>
                  <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                    {member.role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground break-all">{member.email || 'Sin correo sincronizado'}</p>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={selectedRoles[member.userId] || member.role || 'user'}
                  onValueChange={(nextRole) => {
                    setSelectedRoles(prev => ({ ...prev, [member.userId]: nextRole }))
                    void handleRoleChange(member.userId, nextRole)
                  }}
                  disabled={savingRoleUserId === member.userId || member.userId === user?.id || member.role.toLowerCase() === 'owner'}
                >
                  <SelectTrigger className="w-[160px] bg-background/50 border-white/10">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANAGEABLE_ROLES.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <CardHeader className="relative">
          <CardTitle>Accesos concedidos</CardTitle>
          <CardDescription>
            Aquí ves qué usuarios puede administrar cada manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 relative">
          {accessGrants.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-muted/20 p-4 text-sm text-muted-foreground">
              Aún no has creado accesos.
            </div>
          ) : (
            accessGrants.map(grant => {
              const manager = memberById.get(grant.managerUserId)
              const managed = memberById.get(grant.managedUserId)

              return (
                <div key={`${grant.managerUserId}-${grant.managedUserId}`} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-background/40 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {manager?.displayName || manager?.email || grant.managerUserId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      puede ver las ventas de {managed?.displayName || managed?.email || grant.managedUserId}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRevokeAccess(grant.managerUserId, grant.managedUserId)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revocar
                  </Button>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
