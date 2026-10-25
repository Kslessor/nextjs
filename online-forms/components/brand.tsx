import { FileCheck2, FileClock, FileWarning, FileX2 } from 'lucide-react'
import type { FormState } from '@/lib/store'
import { cx } from '@/lib/util'

/** NEXA wordmark, redrawn from the spec cover: N, E, X and an open lambda-style A. */
export function NexaLogo({ className = 'h-6', tone = 'brand' }: { className?: string; tone?: 'brand' | 'white' }) {
  const c = tone === 'white' ? '#ffffff' : '#2b8f91'
  return (
    <svg viewBox="0 0 120 32" className={className} role="img" aria-label="NEXA">
      <g fill={c}>
        <path d="M0 32V0h7.2l13 19.4V0H27v32h-7.1L6.8 12.6V32z" />
        <path d="M31 0h20v6.2H38v6.5h11.6v6H38v7h13V32H31z" />
        <path d="M53 0h8l6 9.6L73 0h8l-10 15.6L82 32h-8.2L67 21.7 60.3 32H52l11-16.4z" />
        <path d="M84 32 97.5 0h6.5L120 32h-7.6L101 8.4 91.8 32z" opacity=".85" />
      </g>
    </svg>
  )
}

const ICON_META: Record<Exclude<FormState, 'none'>, { label: string; cls: string; Icon: typeof FileCheck2 }> = {
  pending: { label: 'Form not yet completed', cls: 'text-[#8b96a5] bg-[#eef1f4] ring-[#dfe4ea]', Icon: FileClock },
  complete: { label: 'Form completed — no action required', cls: 'text-emerald-600 bg-emerald-50 ring-emerald-200', Icon: FileCheck2 },
  action: { label: 'Form completed — action required', cls: 'text-rose-600 bg-rose-50 ring-rose-200', Icon: FileWarning },
}

/** The Q-Flow grey / green / red form icon (spec §21.3.1). */
export function FormStateIcon({ state, size = 'md', className }: { state: FormState; size?: 'sm' | 'md'; className?: string }) {
  if (state === 'none')
    return (
      <span className={cx('inline-grid place-items-center rounded-md text-muted/40', size === 'sm' ? 'h-6 w-6' : 'h-7 w-7', className)} title="No form linked">
        <FileX2 className="h-4 w-4" />
      </span>
    )
  const m = ICON_META[state]
  return (
    <span title={m.label} className={cx('inline-grid place-items-center rounded-md ring-1 ring-inset', m.cls, size === 'sm' ? 'h-6 w-6' : 'h-7 w-7', className)}>
      <m.Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span className="sr-only">{m.label}</span>
    </span>
  )
}

/** Diagonal band motif borrowed from the NEXA document template. */
export function Bands({ className }: { className?: string }) {
  return (
    <svg className={cx('pointer-events-none', className)} viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden>
      <path d="M-40 0h120l260 400H220z" fill="#2b8f91" opacity=".16" />
      <path d="M150 0h70l260 400h-70z" fill="#2b8f91" opacity=".1" />
    </svg>
  )
}
