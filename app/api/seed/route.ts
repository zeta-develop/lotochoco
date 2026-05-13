import { NextResponse } from "next/server"
import { gamesService } from "@/services/games"
import { settingsService } from "@/services/settings"

// Default games for a lottery POS
const defaultGames = [
  {
    name: "Quiniela",
    playType: "2_digits" as const,
    multiplier: 70,
    isActive: true,
    schedules: [
      { name: "Mañana", time: "11:00" },
      { name: "Mediodia", time: "14:00" },
      { name: "Tarde", time: "18:00" },
      { name: "Noche", time: "21:00" }
    ]
  },
  {
    name: "Nica",
    playType: "3_digits" as const,
    multiplier: 500,
    isActive: true,
    schedules: [
      { name: "Mediodia", time: "12:00" },
      { name: "Noche", time: "20:00" }
    ]
  },
  {
    name: "Tica",
    playType: "3_digits" as const,
    multiplier: 500,
    isActive: true,
    schedules: [
      { name: "Mediodia", time: "13:00" },
      { name: "Noche", time: "19:00" }
    ]
  },
  {
    name: "La Diaria",
    playType: "2_digits" as const,
    multiplier: 65,
    isActive: true,
    schedules: [
      { name: "11AM", time: "11:00" },
      { name: "3PM", time: "15:00" },
      { name: "9PM", time: "21:00" }
    ]
  },
  {
    name: "Super Chance",
    playType: "1_digit" as const,
    multiplier: 8,
    isActive: true,
    schedules: [
      { name: "Mañana", time: "10:00" },
      { name: "Tarde", time: "16:00" },
      { name: "Noche", time: "22:00" }
    ]
  }
]

const defaultSettings = {
  businessName: "Loteria La Fortuna",
  currency: "C$",
  ticketMessage: "Gracias por su compra. Conserve su ticket para reclamar premios. Buena suerte!",
  printerType: "network",
  printerIp: "",
  printerPort: "9100",
  darkMode: false
}

// POST /api/seed - Initialize database with default data
export async function POST() {
  try {
    // Check if games already exist
    const existingGames = await gamesService.getAll()
    
    if (existingGames.length === 0) {
      // Create default games with schedules
      for (const gameData of defaultGames) {
        const { schedules, ...game } = gameData
        const createdGame = await gamesService.create(game)
        
        // Add schedules to the game
        for (const schedule of schedules) {
          await gamesService.addSchedule(createdGame.id, schedule)
        }
      }
    }

    // Initialize default settings
    await settingsService.update(defaultSettings)

    return NextResponse.json({
      success: true,
      message: "Base de datos inicializada correctamente",
      gamesCreated: existingGames.length === 0 ? defaultGames.length : 0
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: "Error al inicializar base de datos" },
      { status: 500 }
    )
  }
}

// GET /api/seed - Check initialization status
export async function GET() {
  try {
    const games = await gamesService.getAll()
    const settings = await settingsService.getAll()

    return NextResponse.json({
      initialized: games.length > 0,
      gamesCount: games.length,
      settings: {
        businessName: settings.businessName,
        currency: settings.currency
      }
    })
  } catch (error) {
    console.error("Seed check error:", error)
    return NextResponse.json({
      initialized: false,
      error: "Error al verificar estado"
    })
  }
}
