import { supabase } from '@/lib/supabase/client';
import { getSetting } from '@/services/settings';

async function deriveCompanyName(email?: string | null): Promise<string> {
  try {
    const businessName = await getSetting('businessName');
    const trimmedBusinessName = businessName.trim();

    if (trimmedBusinessName) {
      return trimmedBusinessName;
    }
  } catch {
    // Si falla la lectura local, usamos el fallback por email.
  }

  if (!email) return 'Mi empresa';

  const [localPart] = email.split('@');
  if (!localPart) return 'Mi empresa';

  return `${localPart} POS`;
}

export async function ensureCompanyAccess(): Promise<string | null> {
  // Usar getUser() en lugar de getSession() para validar el token con el servidor
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('[Sync] No hay sesión válida o el token expiró:', authError?.message);
    return null;
  }

  const userId = user.id;

  // Intento 1: Recuperar membresía existente
  const { data: membership, error: membershipError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (membership?.company_id) {
    return membership.company_id;
  }

  // Si no hay membresía, intentamos crear la compañía
  const companyName = await deriveCompanyName(user.email);
  
  await supabase
    .from('companies')
    .insert({ name: companyName });

  // Reintento final de recuperar la membresía después del insert (que activa el trigger)
  const { data: retryMembership, error: retryError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (retryError) {
    throw retryError;
  }

  if (retryMembership?.company_id) {
    return retryMembership.company_id;
  }

  throw new Error('No se pudo establecer el acceso a la compañía después de varios intentos.');
}
