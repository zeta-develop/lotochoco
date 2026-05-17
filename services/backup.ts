import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { SQLiteConnection, CapacitorSQLite } from '@capacitor-community/sqlite'
import { getDb } from '@/lib/db'

export async function exportBackup(): Promise<{ success: boolean; message: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, message: 'Backups solo disponibles en Android/iOS' }
  }

  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    
    // 1. Cerrar conexión actual para asegurar integridad
    // (Opcional, pero recomendado por Capacitor SQLite para exportar el archivo físico)
    
    // 2. Exportar la base de datos a JSON o copiar el archivo .db
    // Usaremos la función nativa de Capacitor SQLite para exportar a un archivo
    // Pero como estamos usando archivos planos, copiaremos el archivo .db directamente
    
    // Nombre del archivo en Android: databases/lotochoco_db.db
    // Vamos a usar copyPhoto o similar? No, mejor usar la API de export de SQLite.
    
    const db = await getDb()
    
    // Exportamos a un archivo JSON (formato interno de Capacitor SQLite)
    // Esto es muy seguro para restaurar en diferentes versiones
    const exportData = await db.exportToJson('full')
    
    const fileName = `lotochoco_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    
    // Guardar temporalmente para compartir
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: JSON.stringify(exportData.export),
      directory: Directory.Cache,
      encoding: 'utf8' as any
    })

    // Compartir el archivo (para que el usuario lo guarde en Drive, WhatsApp, etc)
    await Share.share({
      title: 'Backup Lotochoco',
      text: 'Respaldo de base de datos Lotochoco',
      url: writeResult.uri,
      dialogTitle: 'Guardar respaldo'
    })

    return { success: true, message: 'Backup exportado correctamente' }
  } catch (error) {
    console.error('Error al exportar backup:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

export async function importBackup(jsonData: string): Promise<{ success: boolean; message: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, message: 'Solo disponible en Android/iOS' }
  }

  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    
    // 1. Validar el JSON
    const parsedData = JSON.parse(jsonData)
    
    // 2. Importar usando el motor nativo
    // Esto sobreescribirá la base de datos actual 'lotochoco_db'
    await sqlite.importFromJson(JSON.stringify(parsedData))
    
    // 3. Forzar reinicio de la conexión en lib/db.ts (el usuario debería reiniciar la app)
    return { success: true, message: 'Backup restaurado. Reinicia la aplicación para aplicar los cambios.' }
  } catch (error) {
    console.error('Error al importar backup:', error)
    return { success: false, message: 'El archivo no es un respaldo válido' }
  }
}
