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
    const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single()
    const id = existing?.id || generateId()
    const { error } = await supabase
      .from('settings')
      .upsert({ id, key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }
}
