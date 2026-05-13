import { NextRequest, NextResponse } from "next/server";
import { ticketService } from "@/services/tickets";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const result = await ticketService.cancelTicket(id, reason);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
