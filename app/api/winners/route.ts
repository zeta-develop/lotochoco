import { NextRequest, NextResponse } from 'next/server'
import { getWinners, markWinnerAsPaid } from '@/services/results'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isPaid = searchParams.get('isPaid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const winners = await getWinners({
      isPaid: isPaid !== null ? isPaid === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    })
    
    return NextResponse.json(winners)
  } catch (error) {
    console.error('Error fetching winners:', error)
    return NextResponse.json(
      { error: 'Error al obtener ganadores' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { winnerId } = body
    
    if (!winnerId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del ganador' },
        { status: 400 }
      )
    }
    
    const winner = await markWinnerAsPaid(winnerId)
    
    return NextResponse.json(winner)
  } catch (error) {
    console.error('Error marking winner as paid:', error)
    return NextResponse.json(
      { error: 'Error al marcar ganador como pagado' },
      { status: 500 }
    )
  }
}
