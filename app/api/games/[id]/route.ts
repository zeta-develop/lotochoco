import { NextRequest, NextResponse } from 'next/server'
import { getGameById, updateGame, deleteGame } from '@/services/games'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const game = await getGameById(id)
    
    if (!game) {
      return NextResponse.json(
        { error: 'Juego no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(game)
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json(
      { error: 'Error al obtener juego' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const game = await updateGame(id, body)
    
    return NextResponse.json(game)
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json(
      { error: 'Error al actualizar juego' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteGame(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json(
      { error: 'Error al eliminar juego' },
      { status: 500 }
    )
  }
}
