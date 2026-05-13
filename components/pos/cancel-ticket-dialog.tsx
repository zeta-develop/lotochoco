"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { Ticket, TicketItem } from "@/lib/types";

interface CancelTicketDialogProps {
  ticket: (Ticket & { items: TicketItem[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ticketId: string, reason: string) => Promise<void>;
}

export function CancelTicketDialog({
  ticket,
  open,
  onOpenChange,
  onConfirm,
}: CancelTicketDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!ticket || !reason.trim()) return;

    setIsLoading(true);
    try {
      await onConfirm(ticket.id, reason.trim());
      setReason("");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  // Check if ticket can be cancelled (within 5 minutes)
  const canCancel = ticket
    ? new Date().getTime() - new Date(ticket.createdAt).getTime() < 5 * 60 * 1000
    : false;

  const timeRemaining = ticket
    ? Math.max(
        0,
        5 * 60 - Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 1000)
      )
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Ticket
          </DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. El ticket sera marcado como cancelado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ticket info */}
          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket:</span>
              <span className="font-mono font-bold">#{ticket.ticketNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">C${ticket.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jugadas:</span>
              <span>{ticket.items.length}</span>
            </div>
          </div>

          {/* Time warning */}
          {canCancel ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <span>Tiempo restante para cancelar:</span>
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </p>
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                El tiempo para cancelar este ticket ha expirado. Solo se pueden cancelar tickets
                dentro de los primeros 5 minutos.
              </p>
            </div>
          )}

          {/* Reason input */}
          {canCancel && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de cancelacion *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelacion..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                El motivo sera registrado en el historial
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!reason.trim() || isLoading}
            >
              {isLoading ? "Cancelando..." : "Confirmar Cancelacion"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
