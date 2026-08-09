"use client";

import { forwardRef } from "react";
import type { Ticket, TicketItem } from "@/lib/types";
import { renderTicketTemplate, type TemplateTicket } from "@/lib/ticket-template";

interface TicketReceiptProps {
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] };
  settings?: Record<string, string>;
  vendorName?: string;
  terminalName?: string;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings, vendorName, terminalName }, ref) => {
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
      const rendered = renderTicketTemplate(
        tpl,
        ticket as TemplateTicket,
        settings || {},
        { vendorName, terminalName }
      )

      return rendered.split('\n').map((line, i) => {
        let content = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
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
