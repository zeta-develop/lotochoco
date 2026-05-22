import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://placeholder-url.supabase.co') {
  throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL o tiene un valor inválido. Asegúrate de configurarla como un "Repository Secret" en GitHub Actions o define el entorno ("environment") en tu archivo YAML si usas "Environment Secrets".');
}

if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
  throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY o tiene un valor inválido. Asegúrate de configurarla como un "Repository Secret" en GitHub Actions o define el entorno ("environment") en tu archivo YAML si usas "Environment Secrets".');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
