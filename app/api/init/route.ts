import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Initialize database with default data
export async function POST() {
  try {
    // Create default settings if not exists
    const existingSettings = await prisma.setting.findFirst();
    if (!existingSettings) {
      await prisma.setting.create({
        data: {
          businessName: "Loteria La Fortuna",
          currency: "C$",
          ticketMessage: "Gracias por su compra! Buena suerte!",
          printerType: "network",
          printerAddress: "",
          darkMode: false,
        },
      });
    }

    // Create default games if none exist
    const existingGames = await prisma.game.findFirst();
    if (!existingGames) {
      // Quiniela
      const quiniela = await prisma.game.create({
        data: {
          name: "Quiniela",
          type: "TWO_DIGITS",
          multiplier: 70,
          isActive: true,
        },
      });
      await prisma.drawSchedule.createMany({
        data: [
          { gameId: quiniela.id, time: "12:00", isActive: true },
          { gameId: quiniela.id, time: "15:00", isActive: true },
          { gameId: quiniela.id, time: "21:00", isActive: true },
        ],
      });

      // Nica
      const nica = await prisma.game.create({
        data: {
          name: "Nica",
          type: "THREE_DIGITS",
          multiplier: 500,
          isActive: true,
        },
      });
      await prisma.drawSchedule.createMany({
        data: [
          { gameId: nica.id, time: "12:00", isActive: true },
          { gameId: nica.id, time: "19:00", isActive: true },
        ],
      });

      // Terminales
      const terminales = await prisma.game.create({
        data: {
          name: "Terminales",
          type: "ONE_DIGIT",
          multiplier: 8,
          isActive: true,
        },
      });
      await prisma.drawSchedule.createMany({
        data: [
          { gameId: terminales.id, time: "12:00", isActive: true },
          { gameId: terminales.id, time: "21:00", isActive: true },
        ],
      });
    }

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    console.error("Error initializing database:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
