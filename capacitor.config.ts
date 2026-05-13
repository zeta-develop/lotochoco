import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim()

const config: CapacitorConfig = {
  appId: 'com.zetadevelop.lotochoco',
  appName: 'Lotochoco',
  webDir: 'public',
  bundledWebRuntime: false,
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://')
      }
    : undefined,
  android: {
    path: 'android'
  }
}

export default config