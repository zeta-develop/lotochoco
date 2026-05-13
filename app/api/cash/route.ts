import { NextRequest, NextResponse } from 'next/server'
import { 
  openCashSession, 
  getCurrentSession, 
  closeCashSession, 
  addCashMovement,
  getCashSessions,
  getCashSummary
} from '@/services/cash'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current') === 'true'
    const summary = searchParams.get('summary') === 'true'
    const sessionId = searchParams.get('sessionId')
    
    if (current) {
      const session = await getCurrentSession()
      return NextResponse.json(session)
    }
    
    if (summary) {
      const summaryData = await getCashSummary(sessionId || undefined)
      return NextResponse.json(summaryData)
    }
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    
    const sessions = await getCashSessions({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined
    })
    
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching cash data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de caja' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, openingAmount, sessionId, notes, type, amount, description } = body
    
    switch (action) {
      case 'open': {
        if (typeof openingAmount !== 'number') {
          return NextResponse.json(
            { error: 'Se requiere monto inicial' },
            { status: 400 }
          )
        }
        
        const session = await openCashSession(openingAmount)
        return NextResponse.json(session, { status: 201 })
      }
      
      case 'close': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Se requiere ID de sesión' },
            { status: 400 }
          )
        }
        
        const session = await closeCashSession(sessionId, notes)
        return NextResponse.json(session)
      }
      
      case 'movement': {
        if (!sessionId || !type || typeof amount !== 'number' || !description) {
          return NextResponse.json(
            { error: 'Faltan campos requeridos para el movimiento' },
            { status: 400 }
          )
        }
        
        const movement = await addCashMovement({
          cashSessionId: sessionId,
          type,
          amount,
          description
        })
        return NextResponse.json(movement, { status: 201 })
      }
      
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing cash action:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar acción de caja' },
      { status: 500 }
    )
  }
}
