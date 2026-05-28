"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, session: currentSession } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Escuchar el cambio de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN") {

          // Si estamos en un dispositivo nativo, cerrar el navegador si estaba abierto
          if (Capacitor.isNativePlatform()) {
             Browser.close().catch(() => {});
          }
        }
      }
    );

    // Configurar listener para deep links (redirección después del login OAuth)
    let appListener: any = null;

    if (Capacitor.isNativePlatform()) {
      appListener = App.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('supabase.co') || data.url.includes('lotochoco://')) {
          const url = new URL(data.url);

          // Supabase v2 uses PKCE by default and returns a 'code' parameter in the query string
          const code = url.searchParams.get('code');

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            // Close the browser after successful exchange
            Browser.close().catch(() => {});
          } else {
            // Fallback for implicit flow (legacy)
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              Browser.close().catch(() => {});
            }
          }
        }
      });
    }

    // Inicializar el estado de sesión (offline first approach)
    // Ya tenemos la sesión de useAuthStore debido a la persistencia
    setIsInitializing(false);

    return () => {
      subscription.unsubscribe();
      if (appListener) {
        appListener.then((listener: any) => listener.remove());
      }
    };
  }, [setSession, setUser]);

  // Si no tenemos internet, aún podemos tener la sesión persistida
  // No bloqueamos la renderización, permitimos que la app se cargue
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Iniciando sistema...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
