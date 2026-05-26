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
    // Usar maybeSingle para evitar errores si el ajuste no existe aún
    const { data: existing, error: fetchError } = await supabase
      .from('settings')
      .select('id')
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
