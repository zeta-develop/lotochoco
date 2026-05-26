import { supabase } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'

export const settingsRepository = {
  async getAll(): Promise<Record<string, string>> {
    const { data: settings, error } = await supabase.from('settings').select('key, value')
    const result: Record<string, string> = {}
    if (!error && settings) {
      for (const setting of settings) {
        result[setting.key] = setting.value
      }
    }
    return result
  },

  async update(key: string, value: string): Promise<void> {
    // Buscar la compañía actual del usuario
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('No user authenticated')

    const { data: memberships } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userData.user.id)
      .limit(1)

    const companyId = memberships?.[0]?.company_id
    if (!companyId) throw new Error('User has no company')

    // Usar maybeSingle para evitar errores si el ajuste no existe aún
    const { data: existing, error: fetchError } = await supabase
      .from('settings')
      .select('id')
      .eq('company_id', companyId)
      .eq('key', key)
      .maybeSingle()

    if (fetchError) {
      console.error('Error al buscar ajuste existente:', fetchError)
    }

    const id = existing?.id || generateId()
    
    // Al hacer upsert por ID, evitamos problemas con las restricciones de nombres de columna en onConflict
    const { error } = await supabase
      .from('settings')
      .upsert({ 
        id,
        company_id: companyId,
        key, 
        value, 
        updated_at: new Date().toISOString() 
      })
      
    if (error) {
      console.error(`Error al guardar ajuste ${key}:`, error)
      throw error
    }
  }
}
