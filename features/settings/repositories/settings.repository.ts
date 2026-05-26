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
    const now = new Date().toISOString()

    // Guardar por `key` para que el mismo ajuste se actualice en vez de intentar crear una fila nueva por cada cambio.
    // Antes se hacía upsert sin `onConflict`, lo cual usaba el PK `id` y podía provocar filas duplicadas/errores de unicidad en `key`.
    const { error } = await supabase
      .from('settings')
      .upsert({ 
        id: generateId(),
        key, 
        value, 
        updated_at: now
      }, {
        onConflict: 'key'
      })
      
    if (error) {
      console.error(`Error al guardar ajuste ${key}:`, error)
      throw error
    }
  }
}
