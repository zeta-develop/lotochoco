"use client";

import { forwardRef } from "react";
import type { Ticket, TicketItem } from "@/lib/types";

interface TicketReceiptProps {
  ticket: Ticket & { items: (TicketItem & { game?: { name: string; multiplier?: number } })[] };
  settings?: Record<string, string>;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings }, ref) => {
    const businessName = settings?.businessName || "Loteria La Fortuna";
    const currency = settings?.currency || "C$";
    const ticketMessage = settings?.ticketMessage || "Gracias por su compra!";

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 font-mono text-xs mx-auto w-full max-w-[300px] print:w-[58mm] print:p-0"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Header */}
        <div className="text-center pb-2 mb-2 border-b border-dashed border-gray-500">
          <h1 className="font-bold text-xl uppercase leading-tight">{businessName}</h1>
          <p className="text-sm mt-1">Ticket de Loteria</p>
        </div>

        {/* Ticket Info */}
        <div className="space-y-1 pb-2 mb-2 border-b border-dashed border-gray-500 text-sm">
          <div className="flex justify-between">
            <span>TICKET:</span>
            <span className="font-bold">#{ticket.ticketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>FECHA:</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString("es-NI")}</span>
          </div>
          <div className="flex justify-between">
            <span>HORA:</span>
            <span>{new Date(ticket.createdAt).toLocaleTimeString("es-NI", { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}</span>
          </div>
          {ticket.client && (
            <div className="flex justify-between">
              <span>CLIENTE:</span>
              <span className="truncate ml-2">{ticket.client}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="pb-2 mb-2 border-b border-dashed border-gray-500">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-1 w-2/5 font-semibold">JUEGO</th>
                <th className="py-1 w-1/5 text-center font-semibold">NUM</th>
                <th className="py-1 w-2/5 text-right font-semibold">PREMIO</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map((item, index) => {
                const multiplier = item.game?.multiplier || 70;
                const prize = item.amount * multiplier;
                return (
                  <tr key={index} className="align-top">
                    <td className="py-1">
                      <div className="truncate pr-1">{(item.game?.name) || "Juego"}</div>
                      {item.schedule && (
                        <div className="text-[10px] text-gray-600">{item.schedule}</div>
                      )}
                    </td>
                    <td className="py-1 text-center font-bold text-base">
                      {item.number}
                    </td>
                    <td className="py-1 text-right font-semibold">
                      {currency}{prize.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-between font-bold text-lg mb-4">
          <span>TOTAL:</span>
          <span>{currency}{ticket.totalAmount.toFixed(2)}</span>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-dashed border-gray-500">
          <p className="text-sm font-semibold mb-3">{ticketMessage}</p>

          <div className="flex justify-center mb-1">
            {/* Simple barcode representation */}
            <div className="flex gap-px items-end h-10 w-full max-w-[200px] justify-center">
              {ticket.ticketNumber.split("").map((char, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{
                    width: (char.charCodeAt(0) % 3 === 0) ? "3px" : (char.charCodeAt(0) % 2 === 0) ? "2px" : "1px",
                    marginRight: "1px"
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs tracking-widest">{ticket.ticketNumber}</p>
          <p className="text-[11px] text-gray-600 mt-4">
            *** CONSERVE ESTE TICKET ***
          </p>
        </div>
      </div>
    );
  }
);

TicketReceipt.displayName = "TicketReceipt";
