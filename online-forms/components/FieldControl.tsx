'use client'

import { useRef } from 'react'
import { Check, ChevronDown, Lock, Paperclip, UploadCloud, X } from 'lucide-react'
import type { AnswerValue, Field } from '@/lib/types'
import { SMILEYS } from '@/lib/fields'
import { dynamicValue, type RecordContext } from '@/lib/logic'
import { cx } from '@/lib/util'

const BASE =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink placeholder:text-[#9aa5b1] transition-shadow focus:outline-none focus:ring-4 disabled:bg-[#f7f9fa] disabled:text-ink/80'

export function Smiley({ i, className, style }: { i: number; className?: string; style?: React.CSSProperties }) {
  // 0 = very unhappy … 4 = very happy
  const mouth = [
    'M8.5 16.5c1.8-2.2 5.2-2.2 7 0',
    'M9 16c1.6-1.2 4.4-1.2 6 0',
    'M9 15.5h6',
    'M9 14.5c1.6 1.3 4.4 1.3 6 0',
    'M8 14c1.9 2.6 6.1 2.6 8 0',
  ][i]
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      {i === 0 ? (
        <>
          <path d="M8 9.8l2 .8M16 9.8l-2 .8" />
        </>
      ) : (
        <>
          <circle cx="9" cy="10" r=".9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
      <path d={mouth} />
    </svg>
  )
}

export function FieldControl({
  field: f,
  value,
  onChange,
  error,
  disabled,
  accent = '#1f7577',
  ctx = {},
  compact,
}: {
  field: Field
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  error?: string
  disabled?: boolean
  accent?: string
  ctx?: RecordContext
  compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const id = `q_${f.id}`
  const ring = error ? 'border-rose-400 focus:ring-rose-500/15' : 'border-[#d8dfe5] focus:border-[var(--accent)] focus:ring-[color:var(--accent-soft)]'
  const style = { '--accent': accent, '--accent-soft': `${accent}26` } as React.CSSProperties
  const str = value === undefined || value === null ? '' : String(value)

  const label = (
    <div className={cx('mb-2', f.type === 'dynamic' && 'mb-1')}>
      <label htmlFor={id} className={cx('block font-semibold text-ink leading-snug', compact ? 'text-[13.5px]' : 'text-[15px]')}>
        {f.label || <span className="text-muted italic">Untitled question</span>}
        {f.required && f.type !== 'dynamic' && <span className="text-rose-500"> *</span>}
      </label>
      {f.helpText && <p className="text-[13px] text-muted mt-0.5">{f.helpText}</p>}
    </div>
  )

  let control: React.ReactNode
  switch (f.type) {
    case 'dynamic':
      control = (
        <div className="flex items-center gap-2 rounded-xl bg-[#f3f6f8] border border-dashed border-[#d3dbe2] px-3.5 py-2.5 text-[15px] font-medium text-ink">
          <span className="flex-1">{dynamicValue(f.dynamicKey, ctx)}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <Lock className="h-3 w-3" /> Record
          </span>
        </div>
      )
      break
    case 'long_text':
      control = (
        <div>
          <textarea
            id={id}
            value={str}
            disabled={disabled}
            placeholder={f.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={compact ? 3 : 4}
            className={cx(BASE, ring, 'py-3 resize-y')}
          />
          {f.maxLength ? <p className="text-right text-xs text-muted mt-1">{str.length}/{f.maxLength}</p> : null}
        </div>
      )
      break
    case 'short_text':
    case 'email':
    case 'phone':
    case 'number':
      control = (
        <input
          id={id}
          type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
          inputMode={f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined}
          value={str}
          disabled={disabled}
          placeholder={f.placeholder || (f.type === 'email' ? 'name@domain.com' : '')}
          maxLength={f.maxLength}
          onChange={(e) => {
            const v = e.target.value
            // Prevent non-numeric characters (spec §13.3.1)
            if (f.type === 'number' && v && !/^-?\d*\.?\d*$/.test(v)) return
            if (f.type === 'phone' && v && !/^[\d\s()+-]*$/.test(v)) return
            onChange(v)
          }}
          className={cx(BASE, ring, 'h-12')}
        />
      )
      break
    case 'date':
      control = (
        <input
          id={id}
          type="date"
          value={str}
          min={f.minDate}
          max={f.maxDate}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cx(BASE, ring, 'h-12 max-w-[240px]')}
        />
      )
      break
    case 'dropdown':
      control = (
        <div className="relative">
          <select id={id} value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cx(BASE, ring, 'h-12 appearance-none pr-10 cursor-pointer', !str && 'text-[#9aa5b1]')}>
            <option value="">Select an option</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o} className="text-ink">
                {o}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        </div>
      )
      break
    case 'radio':
    case 'checkboxes': {
      const multi = f.type === 'checkboxes'
      const arr = Array.isArray(value) ? value : []
      control = (
        <div role={multi ? 'group' : 'radiogroup'} aria-labelledby={id} className="space-y-2">
          {(f.options ?? []).map((o) => {
            const on = multi ? arr.includes(o) : str === o
            return (
              <button
                key={o}
                type="button"
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(multi ? (on ? arr.filter((x) => x !== o) : [...arr, o]) : o)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[14.5px] transition-all disabled:cursor-default',
                  on ? 'border-[var(--accent)] bg-[color:var(--accent-soft)]/40 ring-1 ring-[var(--accent)]' : 'border-[#d8dfe5] hover:border-[#b9c4ce] bg-white',
                  error && !on && 'border-rose-300',
                )}
                style={on ? { backgroundColor: `${accent}0f` } : undefined}
              >
                <span
                  className={cx('grid place-items-center h-5 w-5 shrink-0 border-[1.5px] transition-colors', multi ? 'rounded-md' : 'rounded-full')}
                  style={{ borderColor: on ? accent : '#b6c1cb', backgroundColor: on && multi ? accent : 'white' }}
                >
                  {on && (multi ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />)}
                </span>
                <span className="text-ink">{o}</span>
              </button>
            )
          })}
        </div>
      )
      break
    }
    case 'smiley':
      control = (
        <div role="radiogroup" className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-[420px]">
          {SMILEYS.map((s, i) => {
            const on = str === s
            const tones = ['#e5484d', '#f08c3a', '#9aa5b1', '#46a6a8', '#2b8f91']
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={s}
                title={s}
                disabled={disabled}
                onClick={() => onChange(s)}
                className={cx('group flex flex-col items-center gap-1 rounded-xl py-2 transition-all', on ? 'bg-white shadow-lift ring-1' : 'hover:bg-black/[.03]')}
                style={on ? ({ '--tw-ring-color': tones[i] } as React.CSSProperties) : undefined}
              >
                <Smiley
                  i={i}
                  style={on ? { color: tones[i] } : undefined}
                  className={cx('h-9 w-9 sm:h-10 sm:w-10 transition-transform', on ? 'scale-110' : 'text-[#a9b3bd] group-hover:text-[#7d8894]')}
                />
                <span className={cx('text-[10.5px] font-semibold leading-tight text-center', on ? 'text-ink' : 'text-muted/80')} style={on ? { color: tones[i] } : undefined}>
                  {s}
                </span>
              </button>
            )
          })}
        </div>
      )
      break
    case 'file': {
      const [name, size] = str.split('|')
      control = str ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#d8dfe5] bg-white px-3.5 py-3">
          <span className="grid place-items-center h-9 w-9 rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
            <Paperclip className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold truncate">{name}</span>
            {size && <span className="block text-xs text-muted">{size}</span>}
          </span>
          {!disabled && (
            <button type="button" onClick={() => onChange('')} className="text-muted hover:text-ink" aria-label="Remove file">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className={cx('flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors', error ? 'border-rose-300' : 'border-[#d3dbe2] hover:border-[#aab6c1] hover:bg-[#fafbfc]')}
        >
          <UploadCloud className="h-6 w-6 text-muted" />
          <span className="text-sm font-semibold text-ink">Click to upload</span>
          <span className="text-xs text-muted">
            {(f.fileTypes || 'Any file').replace(/,/g, ', ')} · up to {f.maxFileMb ?? 10} MB
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={f.fileTypes}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (f.maxFileMb && file.size > f.maxFileMb * 1048576) {
                alert(`That file is larger than ${f.maxFileMb} MB.`)
                return
              }
              onChange(`${file.name}|${(file.size / 1024).toFixed(0)} KB`)
            }}
          />
        </button>
      )
      break
    }
  }

  return (
    <div style={style} data-field={f.id}>
      {label}
      {control}
      {error && (
        <p role="alert" className="mt-1.5 text-[13px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
