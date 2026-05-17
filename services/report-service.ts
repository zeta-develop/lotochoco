import { Capacitor } from '@capacitor/core'
import packageJson from '../package.json'

export async function sendErrorReport(title: string, details: string): Promise<{ success: boolean; message: string }> {
  try {
    // Capturamos metadata básica sin necesidad de plugins extra por ahora
    const deviceMetadata = {
      platform: Capacitor.getPlatform(),
      appVersion: packageJson.version,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    }

    const response = await fetch('https://lotochoco.vercel.app/api/report', { // Reemplaza con tu URL real
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: details,
        deviceMetadata
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al enviar el reporte')
    }

    return { success: true, message: 'Reporte enviado con éxito' }
  } catch (error) {
    console.error('Error sending report:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'No se pudo enviar el reporte' 
    }
  }
}
