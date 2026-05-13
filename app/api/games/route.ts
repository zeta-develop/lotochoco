import { NextRequest, NextResponse } from 'next/server'
import { getGames, getActiveGames, createGame, seedDefaultGames } from '@/services/games'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    
    // Seed default games if needed
    await seedDefaultGames()
    
    const games = activeOnly ? await getActiveGames() : await getGames()
    
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Error al obtener juegos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { name, digitCount, multiplier, schedules } = body
    
    if (!name || !digitCount || !multiplier) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }
    
    const game = await createGame({
      name,
      digitCount: parseInt(digitCount),
      multiplier: parseFloat(multiplier),
      schedules
    })
    
    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Error al crear juego' },
      { status: 500 }
    )
  }
}
