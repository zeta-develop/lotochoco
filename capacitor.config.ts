import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zetadevelop.lotochoco',
  appName: 'Lotochoco',
  webDir: 'out',
  bundledWebRuntime: false,
  android: {
    path: 'android'
  }
}

export default config