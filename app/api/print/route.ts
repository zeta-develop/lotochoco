import { NextResponse } from "next/server"
import { ticketService } from "@/services/tickets"
import { settingsService } from "@/services/settings"
import { printerService } from "@/services/printer"

// POST /api/print - Print a ticket
export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json()

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      )
    }

    // Get ticket with items
    const ticket = await ticketService.getById(ticketId)
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Get settings
    const settings = await settingsService.getAll()

    // Generate ESC/POS commands
    const commands = printerService.generateTicketCommands({
      ticketNumber: ticket.ticketNumber,
      createdAt: ticket.createdAt,
      items: ticket.items.map((item: { game: { name: string }; number: string; drawTime: string; amount: number }) => ({
        gameName: item.game.name,
        number: item.number,
        drawTime: item.drawTime,
        amount: item.amount
      })),
      total: ticket.total,
      businessName: settings.businessName || "LOTERIA POS",
      currency: settings.currency || "C$",
      footerMessage: settings.ticketMessage || "Gracias por su compra"
    })

    // In a real implementation, this would send to the printer
    // For now, we return the commands as base64
    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      commands: Buffer.from(commands).toString("base64"),
      // For browser-based printing
      printData: {
        businessName: settings.businessName,
        ticketNumber: ticket.ticketNumber,
        date: ticket.createdAt,
        items: ticket.items,
        total: ticket.total,
        currency: settings.currency,
        message: settings.ticketMessage
      }
    })
  } catch (error) {
    console.error("Print error:", error)
    return NextResponse.json(
      { error: "Failed to generate print data" },
      { status: 500 }
    )
  }
}
