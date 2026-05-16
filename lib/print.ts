export function printHtmlDocument(html: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  // Prefer opening a new window/tab on mobile where hidden iframe printing often fails.
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)

  const openAndPrint = (win: Window | null) => {
    try {
      if (!win) return
      const doc = win.document
      doc.open()
      doc.write(html)
      doc.close()
      // Give the browser a moment to render before calling print
      win.focus()
      // Some mobile browsers ignore programmatic print; opening the window lets the user use native print.
      win.print()
      // Close after a short delay where appropriate
      try { win.close() } catch {}
    } catch (e) {
      // ignore
    }
  }

  if (isMobile) {
    const newWin = window.open('', '_blank')
    if (!newWin) {
      // Fallback: write into current document (will replace app) as last resort
      document.open()
      document.write(html)
      document.close()
      window.print()
      return
    }
    openAndPrint(newWin)
    return
  }

  // Desktop flow: try hidden iframe first
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')

  const cleanup = () => {
    window.setTimeout(() => {
      try { iframe.remove() } catch {}
    }, 0)
  }

  document.body.appendChild(iframe)

  const printWindow = iframe.contentWindow
  const printDocument = printWindow?.document
  if (!printWindow || !printDocument) {
    cleanup()
    // fallback to new window
    const newWin = window.open('', '_blank')
    openAndPrint(newWin)
    return
  }

  printDocument.open()
  printDocument.write(html)
  printDocument.close()

  const onAfterPrint = () => {
    try { printWindow.removeEventListener('afterprint', onAfterPrint) } catch {}
    cleanup()
  }

  try { printWindow.addEventListener('afterprint', onAfterPrint) } catch {}

  window.setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch {
      // fallback to new window
      const newWin = window.open('', '_blank')
      openAndPrint(newWin)
    }
    // Fallback cleanup for environments where afterprint is unreliable.
    window.setTimeout(cleanup, 5000)
  }, 150)
}
