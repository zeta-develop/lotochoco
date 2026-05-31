import { supabase } from './client';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export async function signInWithGoogle() {
  const isNative = Capacitor.isNativePlatform();

  // Set redirectTo based on platform
  // Usamos el esquema de URI personalizado "lotochoco://login" para Android
  const redirectTo = isNative ? 'lotochoco://login' : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
    },
  });

  if (error) throw error;

  if (isNative && data?.url) {
    await Browser.open({ url: data.url });
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}
