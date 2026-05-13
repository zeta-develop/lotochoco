import { NextRequest, NextResponse } from 'next/server'
import { generatePyramid, getLuckyNumbers, analyzeNumber, generateReversePyramid } from '@/services/pyramid'
import { getHotColdNumbers } from '@/services/results'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'pyramid'
    const dateStr = searchParams.get('date')
    const gameId = searchParams.get('gameId')
    
    const date = dateStr ? new Date(dateStr) : new Date()
    
    switch (type) {
      case 'pyramid': {
        const pyramid = generatePyramid(date)
        const luckyNumbers = getLuckyNumbers(pyramid)
        const reversePyramid = generateReversePyramid(date)
        
        return NextResponse.json({
          pyramid,
          luckyNumbers,
          reversePyramid
        })
      }
      
      case 'hot-cold': {
        if (!gameId) {
          return NextResponse.json(
            { error: 'Se requiere ID del juego' },
            { status: 400 }
          )
        }
        
        const hotCold = await getHotColdNumbers(gameId)
        return NextResponse.json(hotCold)
      }
      
      case 'analyze': {
        const number = searchParams.get('number')
        
        if (!number) {
          return NextResponse.json(
            { error: 'Se requiere número para analizar' },
            { status: 400 }
          )
        }
        
        const pyramid = generatePyramid(date)
        const analysis = analyzeNumber(number, pyramid)
        
        return NextResponse.json(analysis)
      }
      
      default:
        return NextResponse.json(
          { error: 'Tipo no válido' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing pyramid request:', error)
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}
