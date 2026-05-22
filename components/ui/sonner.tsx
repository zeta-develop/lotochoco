'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isMobile
}

const Toaster = ({ position, visibleToasts, expand, closeButton, toastOptions, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const isMobile = useIsMobile()
  const resolvedPosition = position ?? (isMobile ? 'bottom-center' : 'top-right')

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position={resolvedPosition}
      visibleToasts={visibleToasts ?? (isMobile ? 1 : 3)}
      expand={expand ?? false}
      closeButton={closeButton ?? !isMobile}
      duration={props.duration ?? (isMobile ? 2400 : 3200)}
      gap={isMobile ? 8 : 12}
      offset={isMobile ? 12 : 16}
      mobileOffset={12}
      // @ts-ignore
      swipeDirections={['down']}
      toastOptions={{
        duration: props.duration ?? (isMobile ? 2400 : 3200),
        closeButton: closeButton ?? !isMobile,
        className: 'mobile-toaster-toast',
        ...toastOptions,
      }}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
