'use client'

import { useEffect, useState, useMemo } from 'react'
import QRCode from 'qrcode'
import { parseTemplateToBlocks, TicketBlock, TicketLike } from '../utils/ticket-template'

interface TicketBodyViewProps {
  template?: string | null
  ticket: TicketLike
  settings?: Record<string, string>
  qrCodeUrl?: string
  isReprint?: boolean
}

export function TicketBodyView({
  template,
  ticket,
  settings,
  qrCodeUrl: externalQrUrl,
  isReprint = false
}: TicketBodyViewProps) {
  const [internalQrUrl, setInternalQrUrl] = useState<string>('')

  const blocks = useMemo(() => {
    return parseTemplateToBlocks(template, ticket, settings, isReprint)
  }, [template, ticket, settings, isReprint])

  const qrBlock = blocks.find((b) => b.type === 'qr') as { type: 'qr'; code: string } | undefined

  useEffect(() => {
    if (externalQrUrl) return
    if (!qrBlock) return

    QRCode.toDataURL(qrBlock.code || 'LOTERIA', {
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setInternalQrUrl)
      .catch((err) => console.error('Error generating QR code in TicketBodyView:', err))
  }, [externalQrUrl, qrBlock?.code])

  const effectiveQrUrl = externalQrUrl || internalQrUrl

  return (
    <div className="text-black font-mono select-text space-y-0.5">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'header_big':
            return (
              <div key={idx} className="text-base font-black text-center uppercase tracking-wide py-0.5">
                {block.text}
              </div>
            )

          case 'header_med':
            return (
              <div key={idx} className="text-xs font-bold text-center uppercase tracking-wide py-0.5">
                {block.text}
              </div>
            )

          case 'separator':
            return (
              <div
                key={idx}
                className="text-center text-[11px] text-gray-500 tracking-tighter select-none font-mono my-1 overflow-hidden"
              >
                --------------------------------
              </div>
            )

          case 'items_header':
            if (block.rawText) {
              return (
                <div
                  key={idx}
                  className="font-mono text-xs font-bold text-black whitespace-pre px-1"
                >
                  {block.rawText}
                </div>
              )
            }
            return (
              <div
                key={idx}
                className="flex justify-between items-center text-xs font-bold text-black font-mono px-1"
              >
                <span className="w-1/3 text-left">{block.col1}</span>
                <span className="w-1/3 text-center">{block.col2}</span>
                <span className="w-1/3 text-right">{block.col3}</span>
              </div>
            )

          case 'item_row':
            if (block.customText) {
              const isDoubleWidth = block.customText.length <= 16
              return (
                <div
                  key={idx}
                  className="font-mono text-sm font-black text-black leading-snug whitespace-pre px-1"
                  style={isDoubleWidth ? { letterSpacing: '0.95ch' } : undefined}
                >
                  {block.customText}
                </div>
              )
            }
            return (
              <div
                key={idx}
                className="flex justify-between items-center text-sm font-mono text-black font-black leading-snug px-1"
              >
                <span className="w-1/3 text-left tracking-widest">{block.number}</span>
                <span className="w-1/3 text-center tracking-wider">{block.amount}</span>
                <span className="w-1/3 text-right tracking-wider">{block.prize}</span>
              </div>
            )

          case 'total':
            return (
              <div
                key={idx}
                className="text-center font-black text-base text-black font-mono my-1 tracking-wider"
              >
                {block.text}
              </div>
            )

          case 'bold_text':
            return (
              <div key={idx} className="text-center font-bold text-xs text-black font-mono">
                {block.text}
              </div>
            )

          case 'text':
            return (
              <div key={idx} className="text-center text-xs text-black font-mono leading-tight">
                {block.text}
              </div>
            )

          case 'qr':
            if (!effectiveQrUrl) return null
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center my-3 w-full text-center"
                style={block.leadingSpaces ? { paddingLeft: `${block.leadingSpaces * 7}px` } : undefined}
              >
                <img
                  src={effectiveQrUrl}
                  alt="Código QR del Ticket"
                  className="w-24 h-24 object-contain mx-auto block"
                />
              </div>
            )

          case 'empty':
            return <div key={idx} className="h-1" />

          default:
            return null
        }
      })}
    </div>
  )
}
