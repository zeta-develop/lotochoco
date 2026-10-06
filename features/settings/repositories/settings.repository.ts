import { supabase } from '@/lib/supabase/client'
import { requireCompanyId } from '@/lib/supabase/company'
import { generateId } from '@/lib/utils'

export const settingsRepository = {
  async getAll(): Promise<Record<string, string>> {
    const { data, error } = await supabase.from('settings').select('key,value').eq('company_id', await requireCompanyId())
    if (error) throw error
    return Object.fromEntries((data || []).map((row: any) => [row.key, row.value]))
  },
  async update(key: string, value: string): Promise<void> {
    const company_id = await requireCompanyId()
    const { error } = await supabase.from('settings').upsert({
      id: generateId(), company_id, key, value, updated_at: new Date().toISOString()
    }, { onConflict: 'company_id,key' })
    if (error) throw error
  }
}
