import { Capacitor } from '@capacitor/core'

export async function exportBackup(): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Los backups se gestionan automáticamente en la nube de Supabase.' }
}

export async function importBackup(jsonData: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'La restauración local ya no está disponible. Los datos se sincronizan con la nube.' }
}
