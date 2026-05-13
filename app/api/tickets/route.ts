import { NextRequest, NextResponse } from 'next/server'
import { createTicket, getTickets, getTodayTickets } from '@/services/tickets'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const today = searchParams.get('today') === 'true'
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    
    if (today) {
      const tickets = await getTodayTickets()
      return NextResponse.json(tickets)
    }
    
    const { tickets, total } = await getTickets({
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })
    
    return NextResponse.json({ tickets, total })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Error al obtener tickets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren items para crear el ticket' },
        { status: 400 }
      )
    }
    
    const ticket = await createTicket(items)
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Error al crear ticket' },
      { status: 500 }
    )
  }
}
