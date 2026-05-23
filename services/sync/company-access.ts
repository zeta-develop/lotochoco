import { supabase } from '@/lib/supabase/client';

function deriveCompanyName(email?: string | null): string {
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

  const companyName = deriveCompanyName(session.user.email);
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .single();

  if (companyError) {
    throw companyError;
  }

  const { error: linkError } = await supabase
    .from('company_users')
    .insert({
      company_id: company.id,
      user_id: userId,
      role: 'owner',
    });

  if (linkError) {
    throw linkError;
  }

  return company.id;
}