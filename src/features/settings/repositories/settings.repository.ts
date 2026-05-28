import { supabase } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'
import { logger } from '@/lib/logger'

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
    try {
      // 1. Obtener el ID de la empresa del usuario actual de forma segura.
      const { data: membership, error: membershipError } = await supabase
        .from('company_users')
        .select('company_id')
        .limit(1)
        .maybeSingle()

      if (membershipError) throw membershipError
      const company_id = membership?.company_id

      if (!company_id) {
        logger.warn('No se pudo determinar la empresa para guardar el ajuste:', key)
        return
      }

      // 2. Usar upsert atómico con onConflict. 
      // Esto es seguro contra condiciones de carrera (race conditions).
      // Omitimos el 'id' para que la DB use el existente o genere uno nuevo vía DEFAULT.
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          company_id, 
          key, 
          value, 
          updated_at: new Date().toISOString() 
        }, { 
          onConflict: 'company_id,key' 
        })
        
      if (error) {
        logger.error(`Error de base de datos al guardar ajuste ${key}:`, error)
        throw new Error(`Error al guardar ajuste: ${error.message}`)
      }
    } catch (err) {
      logger.error('Error crítico en settingsRepository.update:', err)
      throw err
    }
  }
}
