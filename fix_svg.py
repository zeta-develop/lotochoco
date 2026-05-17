import re

with open('services/printer.ts', 'r') as f:
    content = f.read()

new_svg_func = """export function generateTicketImageUrl(
  ticket: Ticket & { items: (TicketItem & { game?: { name: string }; gameName?: string; scheduleTime?: string })[] },
  settings: Record<string, string>
): string {
  // Thermal paper width equivalent 58mm (scaled to ~380px for high res)
  const width = 380
  const baseHeight = 300
  const itemHeight = 35
  const height = baseHeight + ticket.items.length * itemHeight
  const currency = settings.currency || 'C$'
  const businessName = escapeXml(settings.businessName || 'LOTERÍA')
  const ticketMessage = escapeXml(settings.ticketMessage || '¡Buena suerte!')
  const createdAt = escapeXml(format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }))

  const itemRows = ticket.items
    .map((item, index) => {
      const y = 175 + index * itemHeight
      const gameName = escapeXml((item.game?.name || item.gameName || 'Juego').slice(0, 15))
      const number = escapeXml(item.number)
      const schedule = escapeXml((item.schedule || item.scheduleTime || '').slice(0, 8))
      const amount = escapeXml(`${currency}${(item.amount || 0).toFixed(2)}`)

      return `
        <g font-family="'Courier New', Courier, monospace">
          <text x="20" y="${y}" font-size="14" font-weight="700" fill="#000">${gameName}</text>
          <text x="20" y="${y + 12}" font-size="10" fill="#333">${schedule}</text>
          <text x="200" y="${y}" font-size="16" font-weight="900" fill="#000" text-anchor="middle">${number}</text>
          <text x="360" y="${y}" font-size="14" font-weight="700" fill="#000" text-anchor="end">${amount}</text>
        </g>
      `
    })
    .join('')

  const barcodeBars = ticket.ticketNumber.split('').map((char, index) => {
    const barWidth = (char.charCodeAt(0) % 3 === 0) ? 3 : (char.charCodeAt(0) % 2 === 0) ? 2 : 1;
    // Calculate total width to center it roughly. Assuming avg width is 2.
    // simpler is just generating right to left or starting at an offset.
    // Let's just generate the SVG rects
    // X position offset accumulates
    return barWidth;
  });

  let currentX = (width - barcodeBars.reduce((a,b)=>a+b+1, 0)) / 2;
  const barcodeSvg = barcodeBars.map(w => {
    const rect = `<rect x="${currentX}" y="${height - 90}" width="${w}" height="35" fill="#000" />`;
    currentX += w + 1;
    return rect;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <g font-family="'Courier New', Courier, monospace" fill="#000">
        <!-- Header -->
        <text x="${width/2}" y="40" text-anchor="middle" font-size="24" font-weight="900">${businessName}</text>
        <text x="${width/2}" y="60" text-anchor="middle" font-size="14">Ticket de Loteria</text>

        <line x1="15" y1="75" x2="${width-15}" y2="75" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Info -->
        <text x="20" y="95" font-size="14" font-weight="700">TICKET:</text>
        <text x="${width-20}" y="95" text-anchor="end" font-size="14" font-weight="900">#${escapeXml(ticket.ticketNumber)}</text>

        <text x="20" y="115" font-size="14" font-weight="700">FECHA:</text>
        <text x="${width-20}" y="115" text-anchor="end" font-size="14">${createdAt}</text>

        <line x1="15" y1="130" x2="${width-15}" y2="130" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Table Header -->
        <text x="20" y="150" font-size="14" font-weight="900">JUEGO</text>
        <text x="200" y="150" font-size="14" font-weight="900" text-anchor="middle">NUM</text>
        <text x="${width-20}" y="150" font-size="14" font-weight="900" text-anchor="end">MONTO</text>

        <line x1="15" y1="158" x2="${width-15}" y2="158" stroke="#000" stroke-width="1" />

        <!-- Items -->
        ${itemRows}

        <line x1="15" y1="${height - 145}" x2="${width-15}" y2="${height - 145}" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" />

        <!-- Total -->
        <text x="20" y="${height - 120}" font-size="18" font-weight="900">TOTAL:</text>
        <text x="${width-20}" y="${height - 120}" text-anchor="end" font-size="20" font-weight="900">${escapeXml(`${currency}${(ticket.totalAmount || ticket.total || 0).toFixed(2)}`)}</text>

        <line x1="15" y1="${height - 105}" x2="${width-15}" y2="${height - 105}" stroke="#000" stroke-width="2" />

        <!-- Barcode and Footer -->
        ${barcodeSvg}
        <text x="${width/2}" y="${height - 40}" text-anchor="middle" font-size="10" letter-spacing="2">${escapeXml(ticket.ticketNumber)}</text>

        <text x="${width/2}" y="${height - 20}" text-anchor="middle" font-size="12" font-weight="700">${ticketMessage}</text>
        <text x="${width/2}" y="${height - 5}" text-anchor="middle" font-size="10">*** CONSERVE SU TICKET ***</text>
      </g>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}"""

content = re.sub(r'export function generateTicketImageUrl.*?(?=function generateTestPage)', new_svg_func + '\n\n', content, flags=re.DOTALL)

with open('services/printer.ts', 'w') as f:
    f.write(content)
