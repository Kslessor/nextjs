'use client'

import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Check, CheckCircle2, ChevronDown, Info, X, AlertTriangle } from 'lucide-react'
import type { FormStatus } from '@/lib/types'
import { cx } from '@/lib/util'

/* ---------------------------------- Button --------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,.15)] disabled:bg-brand-600/40',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas hover:border-slate-300 shadow-card disabled:text-muted/60',
  ghost: 'text-muted hover:text-ink hover:bg-black/[.04] disabled:text-muted/50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/40',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50',
}
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }>(
  function Button({ variant = 'secondary', size = 'md', icon, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className={cx(
          'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed select-none',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
      >
        {icon}
        {children}
      </button>
    )
  },
)

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx('inline-grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-ink hover:bg-black/[.05] transition-colors disabled:opacity-40 disabled:cursor-not-allowed', className)}
    >
      {children}
    </button>
  )
}

/* ---------------------------------- Inputs --------------------------------- */

const FIELD =
  'w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/70 transition-shadow focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:bg-canvas disabled:text-muted'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} {...rest} className={cx(FIELD, 'h-10', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15', className)} />
})

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cx(FIELD, 'py-2.5 min-h-[88px] resize-y', invalid && 'border-rose-400', className)} />
}

export function Select({ className, children, invalid, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select {...rest} className={cx(FIELD, 'h-10 appearance-none pr-9 cursor-pointer', invalid && 'border-rose-400', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
    </div>
  )
}

export function Label({ children, hint, required, htmlFor }: { children: ReactNode; hint?: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {children}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-brand-600' : 'bg-[#cfd6dd]',
      )}
    >
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div role="tablist" className={cx('inline-flex p-1 rounded-xl bg-[#eceff2] gap-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]',
            value === o.value ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ checked, onChange, disabled, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 cursor-pointer select-none', disabled && 'opacity-60 cursor-not-allowed')}>
      <span
        className={cx(
          'grid place-items-center h-[18px] w-[18px] rounded-[5px] border transition-colors',
          checked ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-[#c3ccd5]',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {children && <span className="text-sm text-ink">{children}</span>}
    </label>
  )
}

/* ---------------------------------- Badges --------------------------------- */

const STATUS_STYLE: Record<FormStatus, string> = {
  draft: 'bg-[#eef1f4] text-[#4a5666] ring-[#dde3e9]',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  unpublished: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  expired: 'bg-rose-50 text-rose-700 ring-rose-200/70',
  archived: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
}
const STATUS_DOT: Record<FormStatus, string> = {
  draft: 'bg-[#8794a3]',
  published: 'bg-emerald-500',
  unpublished: 'bg-amber-500',
  expired: 'bg-rose-500',
  archived: 'bg-zinc-400',
}

export function StatusPill({ status, className }: { status: FormStatus; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold capitalize ring-1 ring-inset', STATUS_STYLE[status], className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {status}
    </span>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium text-ink/80 bg-white ring-1 ring-inset ring-line', className)}>{children}</span>
}

/* ---------------------------------- Overlay -------------------------------- */

function useEscape(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, active])
}

function Portal({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => setEl(document.body), [])
  return el ? createPortal(children, el) : null
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  icon?: ReactNode
}) {
  useEscape(onClose, open)
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
        <div role="dialog" aria-modal="true" className={cx('relative w-full bg-white rounded-2xl shadow-pop animate-rise-in max-h-[90vh] flex flex-col', w)}>
          {(title || description) && (
            <div className="px-6 pt-6 pb-1 flex gap-4">
              {icon}
              <div className="min-w-0 flex-1">
                {title && <h2 className="text-[17px] font-bold text-ink">{title}</h2>}
                {description && <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          )}
          {children && <div className="px-6 py-4 overflow-y-auto">{children}</div>}
          {footer && <div className="px-6 pb-6 pt-2 flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </Portal>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      icon={
        <span className={cx('grid place-items-center h-10 w-10 shrink-0 rounded-full', tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}>
          <AlertTriangle className="h-5 w-5" />
        </span>
      }
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}

export function Drawer({ open, onClose, title, children, width = 'max-w-md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  useEscape(onClose, open)
  if (!open) return null
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-slate-950/30 animate-fade-in" onClick={onClose} />
        <aside className={cx('absolute right-0 top-0 h-full w-full bg-white shadow-pop animate-slide-in flex flex-col', width)}>
          <header className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
            <h2 className="text-base font-bold">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </aside>
      </div>
    </Portal>
  )
}

/* ----------------------------------- Menu ---------------------------------- */

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  hint?: string
}

export function Menu({ trigger, items, align = 'right' }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; items: (MenuItem | 'divider')[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  useEscape(() => setOpen(false), open)
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={cx('absolute z-40 mt-1.5 min-w-[184px] rounded-xl bg-white p-1.5 shadow-lift ring-1 ring-black/5 animate-rise-in', align === 'right' ? 'right-0' : 'left-0')}
        >
          {items.map((it, i) =>
            it === 'divider' ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                disabled={it.disabled}
                title={it.hint}
                onClick={() => {
                  setOpen(false)
                  it.onSelect()
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13px] font-medium text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink hover:bg-canvas',
                )}
              >
                <span className={cx('shrink-0 [&>svg]:h-4 [&>svg]:w-4', it.danger ? 'text-rose-500' : 'text-muted')}>{it.icon}</span>
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------- Toasts --------------------------------- */

interface Toast {
  id: number
  title: string
  body?: string
  tone: 'success' | 'info' | 'error'
}
const ToastCtx = createContext<(t: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, tone: 'success', ...t }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2.5rem)] print:hidden">
        {toasts.map((t) => (
          <div key={t.id} className="flex gap-3 items-start rounded-xl bg-slate-900 text-white px-4 py-3 shadow-pop animate-rise-in">
            {t.tone === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-brand-300 shrink-0 mt-px" />
            ) : t.tone === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-rose-300 shrink-0 mt-px" />
            ) : (
              <Info className="h-5 w-5 text-sky-300 shrink-0 mt-px" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="text-[13px] text-white/70 mt-0.5">{t.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/* --------------------------------- Misc bits ------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('bg-white rounded-2xl border border-line shadow-card', className)}>{children}</div>
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid place-items-center min-w-[20px] h-5 px-1 rounded border border-line bg-white font-mono text-[10px] text-muted">{children}</kbd>
}

export function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}
