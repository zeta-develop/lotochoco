// Pirámide de la Suerte
// Algoritmo que genera números de la suerte basado en la fecha

import type { PyramidResult } from '@/lib/types'
import { format } from 'date-fns'

/**
 * Genera la pirámide de la suerte basada en una fecha
 * 
 * Algoritmo:
 * 1. Tomar la fecha en formato DDMMYYYY (8 dígitos)
 * 2. Sumar dígitos adyacentes para formar la siguiente fila
 * 3. Si la suma es > 9, reducir a un solo dígito (mod 10 o suma de dígitos)
 * 4. Repetir hasta llegar a un solo dígito
 * 
 * Ejemplo para 15/05/2024:
 * 1 5 0 5 2 0 2 4
 *  6 5 5 7 2 2 6
 *   1 0 2 9 4 8
 *    1 2 1 3 2
 *     3 3 4 5
 *      6 7 9
 *       3 6
 *        9
 */

function reduceToSingleDigit(num: number): number {
  // Si es mayor a 9, tomamos el último dígito
  return num % 10
}

function sumDigits(num: number): number {
  // Alternativa: sumar los dígitos hasta obtener uno solo
  while (num > 9) {
    num = String(num).split('').reduce((a, b) => a + parseInt(b), 0)
  }
  return num
}

export function generatePyramid(date: Date = new Date()): PyramidResult {
  // Formato: DDMMYYYY
  const dateStr = format(date, 'ddMMyyyy')
  const digits = dateStr.split('').map(Number)
  
  const layers: string[][] = []
  layers.push(digits.map(String))
  
  let currentLayer = [...digits]
  
  // Generar capas hasta llegar a un dígito
  while (currentLayer.length > 1) {
    const nextLayer: number[] = []
    
    for (let i = 0; i < currentLayer.length - 1; i++) {
      const sum = currentLayer[i] + currentLayer[i + 1]
      nextLayer.push(reduceToSingleDigit(sum))
    }
    
    layers.push(nextLayer.map(String))
    currentLayer = nextLayer
  }
  
  return {
    layers,
    luckyNumber: currentLayer[0].toString(),
    date: format(date, 'dd/MM/yyyy')
  }
}

/**
 * Genera números de la suerte adicionales basados en la pirámide
 * Combina dígitos de diferentes capas para crear números de 2 y 3 dígitos
 */
export function getLuckyNumbers(pyramid: PyramidResult): {
  single: string[]
  double: string[]
  triple: string[]
} {
  const single: Set<string> = new Set()
  const double: Set<string> = new Set()
  const triple: Set<string> = new Set()
  
  // Agregar el número final
  single.add(pyramid.luckyNumber)
  
  // Extraer números de las capas intermedias
  for (const layer of pyramid.layers) {
    for (const digit of layer) {
      single.add(digit)
    }
    
    // Crear pares de la capa
    for (let i = 0; i < layer.length - 1; i++) {
      double.add(`${layer[i]}${layer[i + 1]}`)
    }
    
    // Crear triples de la capa
    for (let i = 0; i < layer.length - 2; i++) {
      triple.add(`${layer[i]}${layer[i + 1]}${layer[i + 2]}`)
    }
  }
  
  // Números especiales: combinando capas
  // Primera columna diagonal
  const diagonal: string[] = []
  for (let i = 0; i < pyramid.layers.length && i < pyramid.layers[i].length; i++) {
    diagonal.push(pyramid.layers[i][i])
  }
  
  if (diagonal.length >= 2) {
    double.add(diagonal.slice(0, 2).join(''))
  }
  if (diagonal.length >= 3) {
    triple.add(diagonal.slice(0, 3).join(''))
  }
  
  // Última columna diagonal
  const reverseDiagonal: string[] = []
  for (let i = 0; i < pyramid.layers.length; i++) {
    const layer = pyramid.layers[i]
    if (layer.length > i) {
      reverseDiagonal.push(layer[layer.length - 1 - i] || layer[layer.length - 1])
    }
  }
  
  if (reverseDiagonal.length >= 2) {
    double.add(reverseDiagonal.slice(0, 2).join(''))
  }
  if (reverseDiagonal.length >= 3) {
    triple.add(reverseDiagonal.slice(0, 3).join(''))
  }
  
  return {
    single: Array.from(single).slice(0, 10),
    double: Array.from(double).slice(0, 15),
    triple: Array.from(triple).slice(0, 10)
  }
}

/**
 * Analiza la compatibilidad de un número con la pirámide del día
 */
export function analyzeNumber(number: string, pyramid: PyramidResult): {
  compatibility: number
  message: string
} {
  const digits = number.split('').map(Number)
  const pyramidDigits = pyramid.layers.flat().map(Number)
  
  let matches = 0
  for (const digit of digits) {
    if (pyramidDigits.includes(digit)) {
      matches++
    }
  }
  
  const compatibility = Math.round((matches / digits.length) * 100)
  
  let message = ''
  if (compatibility >= 80) {
    message = '¡Excelente compatibilidad con la energía del día!'
  } else if (compatibility >= 60) {
    message = 'Buena vibración para este número'
  } else if (compatibility >= 40) {
    message = 'Compatibilidad moderada'
  } else {
    message = 'Baja afinidad con la energía del día'
  }
  
  return { compatibility, message }
}

/**
 * Genera la pirámide inversa (para análisis adicional)
 */
export function generateReversePyramid(date: Date = new Date()): PyramidResult {
  const dateStr = format(date, 'yyyyMMdd') // Formato invertido
  const digits = dateStr.split('').map(Number)
  
  const layers: string[][] = []
  layers.push(digits.map(String))
  
  let currentLayer = [...digits]
  
  while (currentLayer.length > 1) {
    const nextLayer: number[] = []
    
    for (let i = 0; i < currentLayer.length - 1; i++) {
      // Usar diferencia absoluta en lugar de suma
      const diff = Math.abs(currentLayer[i] - currentLayer[i + 1])
      nextLayer.push(diff)
    }
    
    layers.push(nextLayer.map(String))
    currentLayer = nextLayer
  }
  
  return {
    layers,
    luckyNumber: currentLayer[0].toString(),
    date: format(date, 'dd/MM/yyyy')
  }
}
