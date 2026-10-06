"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { getNativeOAuthCode } from '@/lib/supabase/oauth-callback';
import { Browser } from "@capacitor/browser";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, user, selectedCompanyId } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Escuchar el cambio de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        if (event === "SIGNED_IN") {

          // Si estamos en un dispositivo nativo, cerrar el navegador si estaba abierto
          if (Capacitor.isNativePlatform()) {
             Browser.close().catch(() => {});
          }
        }
      }
    );

    // Configurar listener para deep links (redirección después del login OAuth)
    let appListener: Promise<PluginListenerHandle> | null = null;

    if (Capacitor.isNativePlatform()) {
      let lastCode: string | null = null;
      const handleUrl = async (rawUrl: string) => {
        const code = getNativeOAuthCode(rawUrl);
        if (!code || code === lastCode) return;
        lastCode = code;
        try {
          // exchangeCodeForSession verifies the PKCE verifier generated for this login.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) await Browser.close().catch(() => {});
        } catch {
          // Invalid or unsolicited callbacks must not replace the active session.
        }
      };
      appListener = App.addListener('appUrlOpen', data => { void handleUrl(data.url); });
      void App.getLaunchUrl().then(data => {
        if (data?.url) void handleUrl(data.url);
      }).catch(() => {});
    }

    // Inicializar el estado de sesión (offline first approach)
    // Ya tenemos la sesión de useAuthStore debido a la persistencia
    setIsInitializing(false);

    return () => {
      subscription.unsubscribe();
      if (appListener) {
        void appListener.then(listener => listener.remove()).catch(() => {});
      }
    };
  }, [setSession]);

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

  return <div key={`${user?.id ?? 'signed-out'}:${selectedCompanyId ?? 'no-company'}`} className="contents">{children}</div>;
}
