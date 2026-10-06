import { formatTime12h } from '@/lib/utils'
import { resolveTicketData, type TicketLike } from '@/features/settings/utils/ticket-template'

export const SHARED_TICKET_WIDTH = 600

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!))

/** Standalone HTML layout, independent of the thermal template and modal width. */
export function buildSharedTicketHtml(ticket: TicketLike, settings: Record<string, string>, qrUrl: string) {
  const data = resolveTicketData(ticket, settings)
  let issuedAt = 'Fecha no disponible'
  if (ticket.createdAt && !Number.isNaN(new Date(ticket.createdAt).getTime())) {
    issuedAt = new Intl.DateTimeFormat('es-NI', { timeZone: 'America/Managua', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ticket.createdAt))
  }
  const currency = escapeHtml(data.currency)
  const number = (value: string) => escapeHtml(Number(value).toLocaleString('es-NI', { maximumFractionDigits: 2 }))
  const money = (value: string) => `${currency} ${number(value)}`
  const games = [...new Set(data.items.map(item => item.game))]
  const schedules = [...new Set((ticket.items || []).map(item => {
    const schedule = item.scheduleName || item.schedule || ''
    return formatTime12h(schedule) || schedule
  }).filter(Boolean))]
  const mixed = games.length > 1 || schedules.length > 1
  const purple = '#5b21b6'
  const detail = (label: string, value: string) => `<div style="margin-top:8px;overflow-wrap:anywhere">${label}: ${escapeHtml(value || '—')}</div>`
  const rows = data.items.map((item, index) => {
    const source = ticket.items?.[index]
    const schedule = source?.scheduleName || source?.schedule || ''
    return `<tr>
      <td style="padding:10px 12px;text-align:left;vertical-align:top"><strong style="font-size:36px;letter-spacing:1px">${escapeHtml(item.number)}</strong>${mixed ? `<div style="font-size:15px;margin-top:5px;overflow-wrap:anywhere">${escapeHtml(item.game)} · ${escapeHtml(formatTime12h(schedule) || schedule)}</div>` : ''}</td>
      <td style="padding:10px 12px;text-align:center;vertical-align:top;font-size:36px;font-weight:700;overflow-wrap:anywhere">${number(item.amount)}</td>
      <td style="padding:10px 12px;text-align:right;vertical-align:top;font-size:36px;font-weight:700;overflow-wrap:anywhere">${number(item.prize)}</td>
    </tr>`
  }).join('')
  const preview = ticket.id === 'preview' || data.ticketNumber === 'VERIFICACIÓN'
  const status = preview ? 'VISTA PREVIA · SIN VENTA REGISTRADA' : ticket.status === 'cancelled' ? 'BOLETO ANULADO' : data.receiptType ? 'Copia reimpresa' : 'Boleto reenviado'
  return `<article lang="es" style="box-sizing:border-box;width:${SHARED_TICKET_WIDTH}px;padding:20px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-weight:700;line-height:1.2;overflow:visible">
    <header style="padding:0 8px 16px;text-align:center;color:${purple};font-size:27px;font-weight:700">
      <div style="margin-bottom:8px">${status}</div>
      ${detail('Juego', games.join(' / '))}
      ${detail('Folio', data.ticketNumber)}
      ${detail('Fecha', issuedAt)}
      ${detail('Sorteo', schedules.join(' / '))}
      ${detail('Cliente', data.client)}
      ${detail('Vendedor', settings.vendorName || '')}
      ${detail('Puesto', settings.terminalId || settings.terminalName || '')}
    </header>
    <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-variant-numeric:tabular-nums">
      <thead><tr style="background:${purple};color:#fff;font-size:25px">
        <th style="width:33.33%;padding:11px 12px;text-align:left;border-radius:6px 0 0 6px">Apuesta</th>
        <th style="width:33.33%;padding:11px 12px;text-align:center">Monto</th>
        <th style="width:33.33%;padding:11px 12px;text-align:right;border-radius:0 6px 6px 0" title="Premio potencial según el resultado del sorteo">Premio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin:12px 0 18px;text-align:center;color:${purple};font-size:29px;font-weight:700;overflow-wrap:anywhere">TOTAL: ${money(data.total)}</div>
    <footer style="text-align:center;color:${purple};font-size:24px;overflow-wrap:anywhere">
      <strong style="display:block;margin-bottom:8px">${mixed ? 'Válido para los sorteos indicados' : 'Boleto válido para 1 sorteo'}</strong>
      <div style="margin-bottom:8px">Por favor revisar su compra</div>
      <div style="margin-bottom:12px">${escapeHtml(settings.ticketMessage || 'No se aceptan devoluciones')}</div>
      ${preview ? '' : `<img src="${escapeHtml(qrUrl)}" alt="Código del comprobante" width="220" height="220" style="display:block;margin:0 auto"/>`}
    </footer>
  </article>`
}
