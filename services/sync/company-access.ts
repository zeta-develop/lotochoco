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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;

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

  const companyName = await deriveCompanyName(session.user.email);
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .maybeSingle();

  if (companyError && companyError.code === '42501') {
     console.warn('[Sync] RLS falló al insertar compañía. Es posible que ya exista una compañía o no tenga permisos.', companyError);
     // Intenta recuperar si ya existe una por algún motivo
     const { data: existingCompany } = await supabase.from('companies').select('id').limit(1).maybeSingle();
     if (existingCompany?.id) return existingCompany.id;
     throw companyError;
  }

  if (companyError) {
    throw companyError;
  }

  return company!.id;
}
