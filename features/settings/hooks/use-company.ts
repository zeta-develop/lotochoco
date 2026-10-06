'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

export interface CompanyInfo {
  id: string
  name: string
  role: string
}

export function useCompany() {
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user, selectedCompanyId, setCompanyId } = useAuthStore()
  const [companies, setCompanies] = useState<CompanyInfo[]>([])
  const requestId = useRef(0)

  const fetchCompany = useCallback(async () => {
    const currentRequest = ++requestId.current
    if (!user) {
      setCompany(null)
      setCompanies([])
      setIsLoading(false)
      return
    }

    try {
      // Intentamos obtener la relación empresa-usuario
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          role,
          company:companies (
            id,
            name
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Supabase error fetching company:', error.message, error.details)
        throw error
      }

      if (requestId.current !== currentRequest || useAuthStore.getState().user?.id !== user.id) return
      const available: CompanyInfo[] = (data ?? []).flatMap((membership: any) => {
        const comp = membership.company
        return comp ? [{ id: comp.id, name: comp.name, role: membership.role || 'user' }] : []
      })
      setCompanies(available)
      const selected = available.find(item => item.id === selectedCompanyId)
      if (selected) {
        setCompany(selected)
      } else if (available.length === 1) {
        setCompanyId(available[0].id)
        setCompany(available[0])
      } else {
        setCompany(null)
        if (selectedCompanyId) setCompanyId(null)
      }
    } catch (error: any) {
      if (requestId.current !== currentRequest) return
      setCompany(null)
      setCompanies([])
      console.error('Detailed error fetching company info:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    } finally {
      if (requestId.current === currentRequest) setIsLoading(false)
    }
  }, [user, selectedCompanyId, setCompanyId])

  useEffect(() => {
    fetchCompany()

    if (user?.id) {
      // Usar un ID único para evitar error de colisión de canales en re-renders de React
      const channelId = Math.random().toString(36).substring(7)
      const roleChannel = supabase
        .channel(`user_role_sync_${user.id}_${channelId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            table: 'company_users', 
            schema: 'public', 
            filter: `user_id=eq.${user.id}` 
          },
          () => {
            console.log('Role change detected via Realtime, refreshing...')
            fetchCompany()
          }
        )
        .subscribe()

      return () => {
        requestId.current += 1
        supabase.removeChannel(roleChannel)
      }
    }
  }, [user?.id, fetchCompany])

  const updateCompanyName = async (newName: string) => {
    const userRole = company?.role?.toLowerCase()
    if (!company || (userRole !== 'owner' && userRole !== 'admin')) {
      return { success: false, message: 'No tienes permisos de administrador' }
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: newName })
        .eq('id', company.id)

      if (error) throw error

      setCompany(prev => prev ? { ...prev, name: newName } : null)
      return { success: true }
    } catch (error) {
      console.error('Error updating company name:', error)
      return { success: false, message: 'Error al actualizar nombre' }
    }
  }

  const role = company?.role?.toLowerCase() || 'user'

  return {
    company,
    companies,
    selectCompany: (id: string) => {
      if (!companies.some(item => item.id === id)) return
      setCompanyId(id)
    },
    isLoading,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    role,
    updateCompanyName,
    refresh: fetchCompany
  }
}
