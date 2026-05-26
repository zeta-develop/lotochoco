'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const { user } = useAuthStore()

  const fetchCompany = useCallback(async () => {
    if (!user) {
      setCompany(null)
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
        .limit(1)

      if (error) {
        console.error('Supabase error fetching company:', error.message, error.details)
        throw error
      }

      if (data && data.length > 0 && data[0].company) {
        const firstMatch = data[0]
        const comp = firstMatch.company as any
        setCompany({
          id: comp.id,
          name: comp.name,
          role: firstMatch.role || 'user'
        })
      } else {
        console.warn('No company membership found for user:', user.id)
        setCompany(null)
      }
    } catch (error: any) {
      console.error('Detailed error fetching company info:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCompany()

    if (user) {
      const roleChannel = supabase
        .channel(`user_role_sync_${user.id}`)
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
        supabase.removeChannel(roleChannel)
      }
    }
  }, [user, fetchCompany])

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
    isLoading,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    role,
    updateCompanyName,
    refresh: fetchCompany
  }
}
