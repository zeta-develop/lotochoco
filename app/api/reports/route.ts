import { NextRequest, NextResponse } from 'next/server'
import { getSalesReport, getDailyReport, getWeeklyReport, getGameReport } from '@/services/reports'
import { getCancellations } from '@/services/tickets'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const date = searchParams.get('date')
    
    switch (type) {
      case 'sales': {
        const report = await getSalesReport({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        })
        return NextResponse.json(report)
      }
      
      case 'daily': {
        const reportDate = date ? new Date(date) : new Date()
        const report = await getDailyReport(reportDate)
        return NextResponse.json(report)
      }
      
      case 'weekly': {
        const report = await getWeeklyReport()
        return NextResponse.json(report)
      }
      
      case 'games': {
        const report = await getGameReport({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        })
        return NextResponse.json(report)
      }
      
      case 'cancellations': {
        const cancellations = await getCancellations({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        })
        return NextResponse.json(cancellations)
      }
      
      default:
        return NextResponse.json(
          { error: 'Tipo de reporte no válido' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Error al obtener reporte' },
      { status: 500 }
    )
  }
}
