"use client";

import { forwardRef } from "react";
import type { Ticket, TicketItem } from "@/lib/types";
import { TicketBodyView } from "@/features/settings/components/TicketBodyView";

interface TicketReceiptProps {
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] };
  settings?: Record<string, string>;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings }, ref) => {
    const paperWidth = settings?.ticketWidth === '80mm' ? '300px' : '260px'

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 font-mono mx-auto w-full max-w-[320px] print:w-[58mm] print:p-0"
      >
        <div 
          style={{ width: paperWidth }}
          className="p-3 bg-white text-black mx-auto print:p-0 print:w-full font-mono text-[12px] leading-snug"
        >
          <TicketBodyView 
            template={settings?.ticketTemplate}
            ticket={ticket}
            settings={settings}
          />
        </div>
      </div>
    );
  }
);

TicketReceipt.displayName = "TicketReceipt";
