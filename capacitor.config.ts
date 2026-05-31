import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zetadevelop.lotochoco',
  appName: 'Lotochoco',
  webDir: 'out',
  android: {
    path: 'android'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
  },
}

export default config