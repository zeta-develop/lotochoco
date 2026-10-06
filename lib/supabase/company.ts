import { supabase } from './client'
import { useAuthStore } from '@/store/auth-store'

/** Resolve an explicitly selected, current membership; never guess among tenants. */
export async function requireCompanyId(): Promise<string> {
  const initial = useAuthStore.getState()
  const initialUserId = initial.user?.id
  const selected = initial.selectedCompanyId
  const assertCurrentAccount = () => {
    const current = useAuthStore.getState()
    if (current.user?.id !== initialUserId || current.selectedCompanyId !== selected) {
      throw new Error('La cuenta o empresa cambió durante la operación. Intenta nuevamente')
    }
  }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const user = data.session?.user
  if (!user) throw new Error('Inicia sesión para continuar')
  assertCurrentAccount()
  if (initialUserId !== user.id) throw new Error('La sesión cambió. Intenta nuevamente')
  const { data: memberships, error: membershipError } = await supabase
    .from('company_users').select('company_id').eq('user_id', user.id)
  if (membershipError) throw membershipError
  const ids = (memberships || []).map((m: { company_id: string }) => m.company_id)
  assertCurrentAccount()
  if (selected && ids.includes(selected)) return selected
  if (selected) throw new Error('La empresa seleccionada ya no está disponible')
  if (ids.length === 1) return ids[0]
  throw new Error(ids.length ? 'Selecciona una empresa para continuar' : 'No tienes acceso a una empresa')
}
