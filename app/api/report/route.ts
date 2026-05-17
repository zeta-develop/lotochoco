import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { title, body, deviceMetadata } = await request.json()
    
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const REPO_OWNER = 'zeta-develop'
    const REPO_NAME = 'lotochoco'

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 })
    }

    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[App Report] ${title}`,
        body: `
### Detalles del Reporte
${body}

---
### Información del Dispositivo
- **Plataforma:** ${deviceMetadata.platform}
- **Versión de App:** ${deviceMetadata.appVersion}
- **User Agent:** ${deviceMetadata.userAgent}
        `,
        labels: ['bug', 'automated-report']
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error al crear el issue en GitHub')
    }

    return NextResponse.json({ success: true, url: data.html_url })
  } catch (error) {
    console.error('Error en API Report:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
