import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

export async function recordAppError(error: any, context?: any) {
  try {
    const id = generateId()
    const now = new Date().toISOString()
    const { error: insertError } = await supabase.from('app_error_logs').insert({
      id, severity: 'error', source: 'client', message: String(error?.message || error), stack: error?.stack ? String(error.stack) : null, details: context ? JSON.stringify(context) : null, url: typeof window !== 'undefined' ? window.location.href : null, user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null, platform: null, created_at: now
    })
    if (insertError) { console.error('Failed to log error to Supabase:', insertError) }
  } catch (e) { console.error('Critical failure in error logger:', e) }
}
