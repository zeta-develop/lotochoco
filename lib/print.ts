export function printHtmlDocument(html: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

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
      iframe.remove()
    }, 0)
  }

  document.body.appendChild(iframe)

  const printWindow = iframe.contentWindow
  const printDocument = printWindow?.document
  if (!printWindow || !printDocument) {
    cleanup()
    return
  }

  printDocument.open()
  printDocument.write(html)
  printDocument.close()

  const onAfterPrint = () => {
    printWindow.removeEventListener('afterprint', onAfterPrint)
    cleanup()
  }

  printWindow.addEventListener('afterprint', onAfterPrint)

  window.setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    // Fallback cleanup for environments where afterprint is unreliable.
    window.setTimeout(cleanup, 5000)
  }, 150)
}
