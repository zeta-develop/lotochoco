import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner';
import { Updater } from '@/components/pos/updater';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ErrorLoggerProvider } from '@/components/providers/error-logger-provider';
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'POS Loteria - Sistema de Ventas',
  description: 'Sistema POS completo para loteria local - Ventas, Sorteos, Reportes',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className="font-sans antialiased min-h-screen">
        <ErrorLoggerProvider>
          <AuthProvider>
            <Updater />
                {children}
                <Toaster
                  position="bottom-center"
                  richColors
                  expand={false}
                  toastOptions={{
                    duration: 2500,
                    style: {
                      marginBottom: 'env(safe-area-inset-bottom, 20px)',
                    }
                  }}
                />

          </AuthProvider>
        </ErrorLoggerProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
