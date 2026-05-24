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

  const { data: membership, error: membershipError } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (membership?.company_id) {
    return membership.company_id;
  }

  const companyName = await deriveCompanyName(user.email);
  
  // Paso 1: Intentar insertar la compañía. 
  // No usamos .select() aquí para evitar el error de RLS inmediato si la política de lectura fuera muy estricta
  const { error: insertError } = await supabase
    .from('companies')
    .insert({ name: companyName });

  if (insertError && insertError.code !== '42501') {
    throw insertError;
  }

  // Paso 2: Intentar recuperar la compañía (ya sea la recién creada o una existente)
  // Con la política de SELECT relajada (auth.uid() IS NOT NULL), esto debería funcionar
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw new Error('No se pudo crear ni recuperar la compañía del usuario.');
  }

  return company.id;
}
