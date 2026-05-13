"use client";

import { forwardRef } from "react";
import type { Ticket, TicketItem, Settings as SettingsType } from "@/lib/types";

interface TicketReceiptProps {
  ticket: Ticket & { items: TicketItem[] };
  settings?: SettingsType;
}

export const TicketReceipt = forwardRef<HTMLDivElement, TicketReceiptProps>(
  ({ ticket, settings }, ref) => {
    const businessName = settings?.businessName || "Loteria La Fortuna";
    const currency = settings?.currency || "C$";
    const ticketMessage = settings?.ticketMessage || "Gracias por su compra!";

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 font-mono text-sm w-[280px] print:w-[58mm]"
        style={{ fontFamily: "monospace" }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <h1 className="font-bold text-lg uppercase tracking-wide">{businessName}</h1>
          <p className="text-xs text-gray-600">Ticket de Loteria</p>
        </div>

        {/* Ticket Info */}
        <div className="space-y-1 border-b border-dashed border-gray-400 pb-3 mb-3 text-xs">
          <div className="flex justify-between">
            <span>Ticket:</span>
            <span className="font-bold">#{ticket.ticketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString("es-NI")}</span>
          </div>
          <div className="flex justify-between">
            <span>Hora:</span>
            <span>{new Date(ticket.createdAt).toLocaleTimeString("es-NI", { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="flex justify-between text-xs font-bold mb-2 border-b border-gray-300 pb-1">
            <span className="w-20">JUEGO</span>
            <span className="w-12 text-center">NUM</span>
            <span className="w-16 text-right">MONTO</span>
          </div>
          {ticket.items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs py-1">
              <span className="w-20 truncate">
                {item.gameName || "Juego"}
                {item.scheduleTime && (
                  <span className="block text-gray-500 text-[10px]">
                    {item.scheduleTime}
                  </span>
                )}
              </span>
              <span className="w-12 text-center font-bold text-base">
                {item.number}
              </span>
              <span className="w-16 text-right">
                {currency}{item.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between font-bold text-base mb-3">
          <span>TOTAL:</span>
          <span>{currency}{ticket.total.toFixed(2)}</span>
        </div>

        {/* Prize Info */}
        {ticket.items.some(item => item.multiplier) && (
          <div className="text-xs text-gray-600 border-t border-dashed border-gray-400 pt-2 mb-3">
            <p className="text-center font-semibold">Multiplicadores:</p>
            {ticket.items.map((item, index) => (
              item.multiplier && (
                <div key={index} className="flex justify-between">
                  <span>{item.number}</span>
                  <span>x{item.multiplier} = {currency}{(item.amount * item.multiplier).toFixed(2)}</span>
                </div>
              )
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-dashed border-gray-400">
          <p className="text-xs text-gray-600 mb-2">{ticketMessage}</p>
          <div className="flex justify-center my-2">
            {/* Simple barcode representation */}
            <div className="flex gap-px">
              {ticket.ticketNumber.split("").map((_, i) => (
                <div
                  key={i}
                  className="bg-black"
                  style={{
                    width: i % 3 === 0 ? "2px" : "1px",
                    height: "30px",
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-500">{ticket.ticketNumber}</p>
          <p className="text-[10px] text-gray-400 mt-2">
            Conserve este ticket para cobrar
          </p>
        </div>
      </div>
    );
  }
);

TicketReceipt.displayName = "TicketReceipt";
