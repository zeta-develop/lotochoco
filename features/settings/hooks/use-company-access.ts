'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useCompany } from './use-company'

export interface CompanyMember {
  companyId: string
  userId: string
  email: string | null
  displayName: string | null
  role: string
  createdAt: string
}

export interface CompanyAccessGrant {
  companyId: string
  managerUserId: string
  managedUserId: string
  createdAt: string
}

export function useCompanyAccess() {
  const { company, isAdmin, isLoading: isCompanyLoading } = useCompany()
  const { user } = useAuthStore()
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [accessGrants, setAccessGrants] = useState<CompanyAccessGrant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memberById = useMemo(() => {
    return new Map(members.map(member => [member.userId, member]))
  }, [members])

  const refresh = useCallback(async () => {
    if (!company || !isAdmin) {
      setMembers([])
      setAccessGrants([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [{ data: membersData, error: membersError }, { data: grantsData, error: grantsError }] = await Promise.all([
        supabase
          .from('company_users')
          .select('company_id, user_id, email, display_name, role, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('company_user_access')
          .select('company_id, manager_user_id, managed_user_id, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true }),
      ])

      if (membersError) throw membersError
      if (grantsError) throw grantsError

      setMembers((membersData || []).map((member: any) => ({
        companyId: member.company_id,
        userId: member.user_id,
        email: member.email,
        displayName: member.display_name,
        role: member.role || 'user',
        createdAt: member.created_at,
      })))

      setAccessGrants((grantsData || []).map((grant: any) => ({
        companyId: grant.company_id,
        managerUserId: grant.manager_user_id,
        managedUserId: grant.managed_user_id,
        createdAt: grant.created_at,
      })))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los accesos'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [company, isAdmin])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!company || !isAdmin) {
      return { success: false, message: 'No tienes permisos para cambiar roles' }
    }

    const { error: updateError } = await supabase
      .from('company_users')
      .update({ role })
      .eq('company_id', company.id)
      .eq('user_id', userId)

    if (updateError) {
      return { success: false, message: updateError.message }
    }

    await refresh()
    return { success: true }
  }, [company, isAdmin, refresh])

  const grantAccess = useCallback(async (managerUserId: string, managedUserId: string) => {
    if (!company || !isAdmin) {
      return { success: false, message: 'No tienes permisos para asignar accesos' }
    }

    const { error: insertError } = await supabase
      .from('company_user_access')
      .upsert(
        {
          company_id: company.id,
          manager_user_id: managerUserId,
          managed_user_id: managedUserId,
          granted_by_user_id: user?.id ?? null,
        },
        { onConflict: 'company_id,manager_user_id,managed_user_id' }
      )

    if (insertError) {
      return { success: false, message: insertError.message }
    }

    await refresh()
    return { success: true }
  }, [company, isAdmin, memberById, refresh])

  const revokeAccess = useCallback(async (managerUserId: string, managedUserId: string) => {
    if (!company || !isAdmin) {
      return { success: false, message: 'No tienes permisos para revocar accesos' }
    }

    const { error: deleteError } = await supabase
      .from('company_user_access')
      .delete()
      .eq('company_id', company.id)
      .eq('manager_user_id', managerUserId)
      .eq('managed_user_id', managedUserId)

    if (deleteError) {
      return { success: false, message: deleteError.message }
    }

    await refresh()
    return { success: true }
  }, [company, isAdmin, refresh])

  return {
    company,
    isAdmin,
    isLoading: isCompanyLoading || isLoading,
    error,
    members,
    accessGrants,
    memberById,
    refresh,
    updateMemberRole,
    grantAccess,
    revokeAccess,
  }
}
