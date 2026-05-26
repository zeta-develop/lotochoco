"use client";

import { forwardRef } from "react";
import type { Ticket, TicketItem } from "@/lib/types";
import { formatTime12h } from '@/lib/utils';

interface TicketReceiptProps {
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] };
  settings?: Record<string, string>;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings }, ref) => {
    const template = settings?.ticketTemplate || `# {{businessName}}
RECIBO DE VENTA
--------------------------------
TICKET: #{{ticketNumber}}
FECHA: {{date}}
--------------------------------
JUEGO      NUM       MONTO
--------------------------------
{{#items}}
{{game}}  {{number}}  {{currency}}{{amount}}
{{/items}}
--------------------------------
**TOTAL: {{currency}}{{total}}**

{{ticketMessage}}
*** CONSERVE ESTE TICKET ***`

    const renderTemplate = (tpl: string) => {
      let rendered = tpl
        .replace(/{{businessName}}/g, settings?.businessName || 'LOTOCHOCO')
        .replace(/{{ticketNumber}}/g, ticket.ticketNumber)
        .replace(/{{date}}/g, new Date(ticket.createdAt).toLocaleString('es-NI', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }))
        .replace(/{{currency}}/g, settings?.currency || 'C$')
        .replace(/{{total}}/g, ticket.totalAmount.toFixed(2))
        .replace(/{{ticketMessage}}/g, settings?.ticketMessage || '')
        .replace(/{{#if client}}.*?{{\/if}}/g, ticket.client ? `CLIENTE: ${ticket.client.toUpperCase()}` : '')

      const itemsRegex = /{{#items}}([\\s\\S]*?){{\/items}}/g
      rendered = rendered.replace(itemsRegex, (match, content) => {
        return ticket.items.map(item => {
          return content
            .replace(/{{game}}/g, (item as any).game?.name || 'JUEGO')
            .replace(/{{number}}/g, item.number)
            .replace(/{{amount}}/g, item.amount.toFixed(0))
        }).join('\n')
      })

      return rendered.split('\n').map((line, i) => {
        let content = line
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
        
        let className = "text-[11px] font-mono leading-tight whitespace-pre-wrap break-all min-h-[1em]"
        if (line.startsWith('# ')) {
          className = "text-lg font-bold text-center uppercase mb-1"
          content = content.replace('# ', '')
        } else if (line.startsWith('## ')) {
          className = "text-sm font-bold text-center uppercase mb-1"
          content = content.replace('## ', '')
        }

        return (
          <div key={i} className={className} dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }} />
        )
      })
    }

    const paperWidth = settings?.ticketWidth === '80mm' ? '300px' : '220px'

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 font-mono mx-auto w-full max-w-[320px] print:w-[58mm] print:p-0"
      >
        <div 
          style={{ width: paperWidth }}
          className="border-2 border-black/5 p-4 rounded-sm shadow-inner bg-slate-50/50 mx-auto print:bg-transparent print:border-none print:shadow-none print:p-0 print:w-full"
        >
          {renderTemplate(template)}
        </div>
      </div>
    );
  }
);

TicketReceipt.displayName = "TicketReceipt";
