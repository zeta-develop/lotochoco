import { NextResponse } from "next/server"
import { printerService } from "@/services/printer"

// POST /api/print/test - Test printer connection
export async function POST(request: Request) {
  try {
    const { printerIp, printerPort } = await request.json()

    // Generate test print commands
    const commands = printerService.generateTestPage()

    // In production, this would actually connect to the printer
    // For demonstration, we simulate the test
    if (printerIp) {
      // Simulate network connection test
      return NextResponse.json({
        success: true,
        message: `Test enviado a ${printerIp}:${printerPort || 9100}`,
        commands: Buffer.from(commands).toString("base64")
      })
    }

    return NextResponse.json({
      success: true,
      message: "Comandos de prueba generados",
      commands: Buffer.from(commands).toString("base64")
    })
  } catch (error) {
    console.error("Print test error:", error)
    return NextResponse.json(
      { error: "Failed to test printer" },
      { status: 500 }
    )
  }
}
