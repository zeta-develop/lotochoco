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
  const money = (value: string) => `${currency} ${escapeHtml(Number(value).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`
  const games = [...new Set(data.items.map(item => item.game))]
  const schedules = [...new Set((ticket.items || []).map(item => {
    const schedule = item.scheduleName || item.schedule || ''
    return formatTime12h(schedule) || schedule
  }).filter(Boolean))]
  const mixed = games.length > 1 || schedules.length > 1
  const detail = (label: string, value: string) => `<div style="min-width:0"><div style="font-size:14px;color:#52616b;margin-bottom:6px">${label}</div><div style="font-size:20px;font-weight:700;overflow-wrap:anywhere">${escapeHtml(value || '—')}</div></div>`
  const rows = data.items.map((item, index) => {
    const source = ticket.items?.[index]
    const schedule = source?.scheduleName || source?.schedule || ''
    return `<tr style="background:${index % 2 ? '#f3f7f6' : '#ffffff'}">
      <td style="padding:13px 16px;width:28%;vertical-align:top"><strong style="font-size:27px;letter-spacing:1px">${escapeHtml(item.number)}</strong>${mixed ? `<div style="font-size:13px;margin-top:4px;overflow-wrap:anywhere">${escapeHtml(item.game)} · ${escapeHtml(formatTime12h(schedule) || schedule)}</div>` : ''}</td>
      <td style="padding:13px 10px;text-align:right;vertical-align:top;font-size:20px;white-space:nowrap">${money(item.amount)}</td>
      <td style="padding:13px 16px;text-align:right;vertical-align:top;font-size:20px;font-weight:700;white-space:nowrap">${money(item.prize)}</td>
    </tr>`
  }).join('')
  const preview = ticket.id === 'preview' || data.ticketNumber === 'VERIFICACIÓN'
  const status = preview ? 'VISTA PREVIA · SIN VENTA REGISTRADA' : ticket.status === 'cancelled' ? 'BOLETO ANULADO' : 'COMPROBANTE DE APUESTA'
  return `<article lang="es" style="box-sizing:border-box;width:${SHARED_TICKET_WIDTH}px;background:#fff;color:#172a32;font-family:Arial,Helvetica,sans-serif;line-height:1.35;overflow:visible">
    <header style="padding:28px 32px;background:#123e36;color:#fff">
      <div style="font-size:15px;letter-spacing:1.4px;margin-bottom:10px">${status}</div>
      <div style="font-size:32px;font-weight:800;overflow-wrap:anywhere">${escapeHtml(settings.businessName || 'LOTOCHOCO')}</div>
      <div style="font-size:18px;margin-top:14px;overflow-wrap:anywhere">Folio <strong>${escapeHtml(data.ticketNumber)}</strong></div>
      <div style="font-size:16px;margin-top:5px">${escapeHtml(issuedAt)}</div>
    </header>
    ${data.receiptType ? '<div style="padding:10px 32px;background:#fff1cc;font-size:16px;font-weight:700">COPIA REIMPRESA</div>' : ''}
    <section style="padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:22px 24px">
      ${detail('Juego', games.join(' / '))}${detail('Sorteo', schedules.join(' / '))}
      ${detail('Cliente', data.client)}${detail('Vendedor', settings.vendorName || '')}
      ${detail('Puesto', settings.terminalId || settings.terminalName || '')}${detail('Jugadas', String(data.items.length))}
    </section>
    <div style="padding:0 24px">
      <table style="width:100%;border-collapse:collapse;table-layout:auto;font-variant-numeric:tabular-nums">
        <thead><tr style="background:#e3eeea;color:#123e36;font-size:15px"><th style="padding:13px 16px;text-align:left">Número</th><th style="padding:13px 10px;text-align:right">Apuesta</th><th style="padding:13px 16px;text-align:right">Premio potencial</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <section style="margin:24px;padding:22px;background:#123e36;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div style="font-size:17px;font-weight:700">TOTAL APOSTADO</div><div style="font-size:32px;font-weight:800;white-space:nowrap">${money(data.total)}</div>
    </section>
    <footer style="padding:4px 32px 28px;display:flex;align-items:center;gap:24px">
      ${preview ? '' : `<img src="${escapeHtml(qrUrl)}" alt="Código del comprobante" width="116" height="116" style="display:block;flex-shrink:0"/>`}
      <div style="font-size:15px;color:#394d54;overflow-wrap:anywhere"><strong style="display:block;margin-bottom:8px;color:#172a32">Revise sus números y el sorteo.</strong>${escapeHtml(settings.ticketMessage || 'Conserve este comprobante. El premio indicado es potencial, sujeto al resultado del sorteo.')}</div>
    </footer>
  </article>`
}
