import { NextRequest, NextResponse } from 'next/server'
import { createResult, processResult, getResults, getTodayResults } from '@/services/results'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const today = searchParams.get('today') === 'true'
    const gameId = searchParams.get('gameId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    
    if (today) {
      const results = await getTodayResults()
      return NextResponse.json(results)
    }
    
    const results = await getResults({
      gameId: gameId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined
    })
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json(
      { error: 'Error al obtener resultados' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, scheduleId, winningNumber, drawDate, autoProcess } = body
    
    if (!gameId || !scheduleId || !winningNumber) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }
    
    const result = await createResult({
      gameId,
      scheduleId,
      winningNumber,
      drawDate: drawDate ? new Date(drawDate) : undefined
    })
    
    let processInfo = null
    
    // Auto-process winners if requested
    if (autoProcess !== false) {
      processInfo = await processResult(result.id)
    }
    
    return NextResponse.json({
      result,
      processed: processInfo
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating result:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear resultado' },
      { status: 500 }
    )
  }
}
