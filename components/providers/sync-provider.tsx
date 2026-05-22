"use client";

import { useSync } from '@/hooks/use-sync';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // Inicializa la sincronización en background (cada 60 segundos por defecto)
  useSync(60000);

  return <>{children}</>;
}
