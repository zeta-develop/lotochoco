import { NextRequest, NextResponse } from 'next/server'
import { getTicketById, getTicketByNumber, cancelTicket } from '@/services/tickets'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if it's a ticket number or ID
    const ticket = id.startsWith('TKT-') 
      ? await getTicketByNumber(id)
      : await getTicketById(id)
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Error al obtener ticket' },
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
    const body = await request.json()
    const { reason } = body
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Se requiere un motivo de cancelación' },
        { status: 400 }
      )
    }
    
    const result = await cancelTicket(id, reason)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Error cancelling ticket:', error)
    return NextResponse.json(
      { error: 'Error al cancelar ticket' },
      { status: 500 }
    )
  }
}
