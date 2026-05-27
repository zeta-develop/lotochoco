'use client'

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumPadProps {
  value: string
  onChange: (value: string) => void
  onConfirm?: () => void
  maxLength?: number
  className?: string
}

// Arrays estáticos fuera del componente para evitar recreación en cada render
const NUMPAD_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const NumPad = memo(function NumPad({ value, onChange, onConfirm, maxLength = 6, className }: NumPadProps) {
  const handleNumber = useCallback((num: string) => {
    if (value.length < maxLength) {
      onChange(value + num)
    }
  }, [value, maxLength, onChange])

  const handleDelete = useCallback(() => {
    onChange(value.slice(0, -1))
  }, [value, onChange])

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {NUMPAD_KEYS.map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          className="h-14 text-xl font-semibold"
          onClick={() => handleNumber(num.toString())}
        >
          {num}
        </Button>
      ))}
      
      <Button
        variant="outline"
        size="lg"
        className="h-14 text-muted-foreground"
        onClick={handleClear}
        aria-label="Limpiar"
      >
        C
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        className="h-14 text-xl font-semibold"
        onClick={() => handleNumber('0')}
      >
        0
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        className="h-14"
        onClick={handleDelete}
        aria-label="Borrar"
      >
        <Delete className="h-5 w-5" />
      </Button>

      {onConfirm && (
        <Button
          size="lg"
          className="col-span-3 h-14 text-lg font-semibold"
          onClick={onConfirm}
          disabled={!value}
        >
          <Check className="mr-2 h-5 w-5" />
          Confirmar
        </Button>
      )}
    </div>
  )
})

interface AmountPadProps {
  value: number
  onChange: (value: number) => void
  quickAmounts?: number[]
  className?: string
}

const DEFAULT_QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500]
const AMOUNT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

export const AmountPad = memo(function AmountPad({ value, onChange, quickAmounts = DEFAULT_QUICK_AMOUNTS, className }: AmountPadProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-3 gap-2">
        {quickAmounts.map((amount) => (
          <Button
            key={amount}
            variant={value === amount ? "default" : "outline"}
            size="lg"
            className="h-12 text-lg font-semibold"
            onClick={() => onChange(amount)}
          >
            {amount}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {AMOUNT_KEYS.map((num, idx) => (
          <Button
            key={num}
            variant="outline"
            size="lg"
            className={cn(
              "h-12 text-lg font-semibold",
              idx === 9 && "col-start-2"
            )}
            onClick={() => {
              const newValue = value * 10 + num
              if (newValue <= 9999) onChange(newValue)
            }}
          >
            {num}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="lg"
          className="h-12"
          onClick={() => onChange(Math.floor(value / 10))}
          aria-label="Borrar"
        >
          <Delete className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-muted-foreground"
          onClick={() => onChange(0)}
          aria-label="Limpiar"
        >
          C
        </Button>
      </div>
    </div>
  )
})
