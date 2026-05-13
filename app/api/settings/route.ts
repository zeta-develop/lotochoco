import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, updateSettings, initializeSettings } from '@/services/settings'

export async function GET() {
  try {
    // Initialize default settings if needed
    await initializeSettings()
    
    const settings = await getAllSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    await updateSettings(body)
    
    const settings = await getAllSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
