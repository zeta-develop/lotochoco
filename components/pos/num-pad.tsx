'use client'

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

export function NumPad({ value, onChange, onConfirm, maxLength = 6, className }: NumPadProps) {
  const handleNumber = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num)
    }
  }

  const handleDelete = () => {
    onChange(value.slice(0, -1))
  }

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
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
}

interface AmountPadProps {
  value: number
  onChange: (value: number) => void
  quickAmounts?: number[]
  className?: string
}

export function AmountPad({ value, onChange, quickAmounts = [10, 20, 50, 100, 200, 500], className }: AmountPadProps) {
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
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, idx) => (
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
        >
          <Delete className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-muted-foreground"
          onClick={() => onChange(0)}
        >
          C
        </Button>
      </div>
    </div>
  )
}
