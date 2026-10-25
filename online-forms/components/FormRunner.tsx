'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldAlert, X, Ban, FileQuestion, Lock, Send } from 'lucide-react'
import type { AnswerValue, Form, Patient } from '@/lib/types'
import { allFieldsOf, nextPageIndex, validatePage, visibleFields, type Answers, type RecordContext, displayAnswer } from '@/lib/logic'
import { HEALTH_NETWORK } from '@/lib/seed'
import { cx } from '@/lib/util'
import { FieldControl } from './FieldControl'

type RunnerForm = Pick<Form, 'title' | 'description' | 'pages' | 'settings'>

export function NetworkMark({ logo, small }: { logo?: string; small?: boolean }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className={cx('object-contain', small ? 'h-8' : 'h-11')} />
  ) : (
    <span className={cx('inline-flex items-center gap-2 font-bold text-brand-700', small ? 'text-[13px]' : 'text-sm')}>
      <span className={cx('grid place-items-center rounded-lg bg-brand-600 text-white', small ? 'h-7 w-7' : 'h-9 w-9')}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
        </svg>
      </span>
      {HEALTH_NETWORK.name}
    </span>
  )
}

/**
 * Renders a form for patients: multi-page with Back/Next, display conditions,
 * page jumps and the spec's validation messages. Used by the editor preview,
 * VisitPlus and the browser link so all three behave identically.
 */
export function FormRunner({
  form,
  ctx = {},
  onSubmit,
  onClose,
  device = 'mobile',
  submitLabel = 'Submit',
  readOnly,
  banner,
}: {
  form: RunnerForm
  ctx?: RecordContext
  onSubmit?: (answers: Answers) => void
  onClose?: () => void
  device?: 'mobile' | 'desktop'
  submitLabel?: string
  readOnly?: Answers
  banner?: ReactNode
}) {
  const all = useMemo(() => allFieldsOf(form), [form])
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [answers, setAnswers] = useState<Answers>(readOnly ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const top = useRef<HTMLDivElement>(null)
  const accent = form.settings.buttonColor || '#1f7577'

  useEffect(() => {
    // Keep the active page valid if the form is edited underneath the preview.
    if (index >= form.pages.length) {
      setIndex(0)
      setHistory([])
    }
  }, [form.pages.length, index])

  const page = form.pages[Math.min(index, form.pages.length - 1)]
  if (!page) return null
  const next = nextPageIndex(form, index, answers)
  const isLast = next === -1
  const multi = form.pages.length > 1

  const set = (id: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }))
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }))
  }

  const scrollTop = () => top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })

  const advance = () => {
    if (!readOnly) {
      const errs = validatePage(page, answers, all)
      if (Object.keys(errs).length) {
        setErrors(errs)
        const first = document.querySelector(`[data-field="${Object.keys(errs)[0]}"]`)
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
    }
    if (isLast) {
      if (readOnly) return onClose?.()
      // Only keep answers the patient actually saw: visited pages, visible fields.
      const visited = [...history, index]
      const payload: Answers = {}
      for (const i of visited) for (const f of visibleFields(form.pages[i], answers, all)) if (answers[f.id] !== undefined) payload[f.id] = answers[f.id]
      onSubmit?.(payload)
      return
    }
    setHistory((h) => [...h, index])
    setIndex(next)
    setErrors({})
    scrollTop()
  }

  const back = () => {
    const prev = history[history.length - 1]
    if (prev === undefined) return
    setHistory((h) => h.slice(0, -1))
    setIndex(prev)
    setErrors({})
    scrollTop()
  }

  const pct = isLast ? 100 : Math.round(((index + 1) / form.pages.length) * 100)

  return (
    <div ref={top} className={cx('relative bg-white', device === 'desktop' ? 'rounded-2xl border border-line shadow-card' : 'min-h-full')}>
      {banner}
      <div className={cx(device === 'desktop' ? 'px-10 pt-8' : 'px-5 pt-5')}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <NetworkMark logo={form.settings.logo} small={device === 'mobile'} />
          {onClose && (
            <button onClick={onClose} aria-label="Close form" className="grid place-items-center h-8 w-8 -mr-1 rounded-full bg-[#f1f4f6] text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {readOnly && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 px-3.5 py-2.5 text-[13px] font-medium ring-1 ring-inset ring-emerald-200">
            <Lock className="h-4 w-4" /> Submitted — view only
          </div>
        )}
        <h1 className={cx('font-extrabold tracking-tight text-[#24456b]', device === 'desktop' ? 'text-[26px]' : 'text-[21px]')} style={{ color: accent }}>
          {form.title || 'Untitled Form'}
        </h1>
        {index === 0 && form.description && <p className="text-[14.5px] text-muted mt-1.5 leading-relaxed">{form.description}</p>}
        {multi && (
          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold text-muted mb-1.5">
              <span>
                Page {index + 1} of {form.pages.length}
              </span>
              <span>{page.title}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#edf1f4] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: accent }} />
            </div>
          </div>
        )}
      </div>

      <div key={page.id} className={cx('animate-rise-in', device === 'desktop' ? 'px-10 py-7' : 'px-5 py-6')}>
        {(page.title || page.description) && (
          <div className="mb-5 pb-4 border-b border-[#eef1f4]">
            {page.title && <h2 className="text-[17px] font-bold text-ink">{page.title}</h2>}
            {page.description && <p className="text-sm text-muted mt-1">{page.description}</p>}
          </div>
        )}
        <div className="space-y-7">
          {visibleFields(page, answers, all).map((f) => (
            <div key={f.id} className="animate-fade-in">
              <FieldControl field={f} value={answers[f.id]} onChange={(v) => set(f.id, v)} error={errors[f.id]} disabled={!!readOnly} accent={accent} ctx={ctx} />
            </div>
          ))}
          {page.fields.length === 0 && <p className="text-sm text-muted italic py-6 text-center">This page has no questions yet.</p>}
        </div>
      </div>

      <div className={cx('sticky bottom-0 bg-white/95 backdrop-blur border-t border-[#eef1f4] flex gap-3', device === 'desktop' ? 'px-10 py-5 rounded-b-2xl' : 'px-5 py-4')}>
        {history.length > 0 && (
          <button type="button" onClick={back} className="inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl border border-[#d8dfe5] font-semibold text-ink hover:bg-[#f7f9fa]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button
          type="button"
          onClick={advance}
          className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2)] transition-[filter] hover:brightness-110 active:brightness-95"
          style={{ backgroundColor: accent }}
        >
          {isLast ? (
            readOnly ? (
              'Close'
            ) : (
              <>
                {submitLabel} <Send className="h-4 w-4" />
              </>
            )
          ) : (
            <>
              Next <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* -------------------------- Post-submit & error states ---------------------- */

export function SubmissionReceived({ message, onClose, accent = '#1f7577' }: { message?: string; onClose?: () => void; accent?: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center min-h-full px-6 py-16 overflow-hidden bg-white">
      <svg className="absolute inset-0 h-full w-full opacity-[.55]" aria-hidden>
        <defs>
          <pattern id="sr-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill={accent} opacity=".12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sr-dots)" />
      </svg>
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: accent }} />
      <div className="relative">
        <span className="relative grid place-items-center h-24 w-24 rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_-8px_rgba(16,185,129,.6)] animate-pop">
          <Check className="h-12 w-12" strokeWidth={3} />
        </span>
      </div>
      <h2 className="relative mt-7 text-[22px] font-extrabold text-ink leading-tight max-w-[260px]">{message || 'Thank you for your submission!'}</h2>
      <p className="relative mt-2 text-sm text-muted max-w-[280px]">Your responses have been sent securely to your care team.</p>
      {onClose && (
        <button onClick={onClose} className="relative mt-10 w-full max-w-[320px] h-12 rounded-xl font-bold text-white" style={{ backgroundColor: accent }}>
          Close
        </button>
      )}
    </div>
  )
}

export type Unavailable = 'expired' | 'submitted' | 'closed' | 'limit' | 'denied' | 'notfound'

const UNAVAILABLE: Record<Unavailable, { title: string; body: string; Icon: typeof Clock3; tone: string }> = {
  expired: { title: 'Link Expired', body: 'Sorry, this link is no longer valid. It may have expired or already been used.', Icon: Clock3, tone: 'bg-amber-50 text-amber-500' },
  submitted: { title: 'Form Already Submitted', body: 'You’ve already completed this form — there’s nothing more you need to do. Thank you!', Icon: Check, tone: 'bg-emerald-50 text-emerald-500' },
  closed: { title: 'Form Closed', body: 'This form is no longer accepting responses. Please contact the facility if you have questions.', Icon: Ban, tone: 'bg-slate-100 text-slate-500' },
  limit: { title: 'Submission Limit Reached', body: 'This form has reached the maximum number of submissions.', Icon: Ban, tone: 'bg-slate-100 text-slate-500' },
  denied: {
    title: 'Access Denied',
    body: `We couldn’t verify your details after 3 attempts. For your security, access to this form has been paused. Please call the facility on ${HEALTH_NETWORK.phone}.`,
    Icon: ShieldAlert,
    tone: 'bg-rose-50 text-rose-500',
  },
  notfound: { title: 'Form Not Found', body: 'We couldn’t find this form. Check the link in your message, or contact the facility.', Icon: FileQuestion, tone: 'bg-slate-100 text-slate-500' },
}

export function UnavailableCard({ kind, onClose }: { kind: Unavailable; onClose?: () => void }) {
  const m = UNAVAILABLE[kind]
  return (
    <div className="w-full max-w-[380px] mx-auto rounded-2xl bg-white shadow-pop overflow-hidden animate-rise-in">
      <div className="px-7 pt-9 pb-7 text-center">
        <span className={cx('mx-auto grid place-items-center h-16 w-16 rounded-full', m.tone)}>
          <m.Icon className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-lg font-bold text-ink">{m.title}</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">{m.body}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="w-full h-14 bg-slate-950 text-white font-semibold hover:bg-slate-900">
          Close
        </button>
      )}
    </div>
  )
}

/** Patient verification screen (spec §3). Three attempts, then access is denied. */
export function VerifyAccess({
  form,
  patient,
  onVerified,
  onDenied,
}: {
  form: Pick<Form, 'settings' | 'title'>
  patient: Patient
  onVerified: () => void
  onDenied: () => void
}) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [dd, setDd] = useState('')
  const [mm, setMm] = useState('')
  const [yy, setYy] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')
  const accent = form.settings.buttonColor || '#1f7577'
  const ready = first.trim() && last.trim() && dd && mm && yy.length === 4

  const verify = () => {
    const dob = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    const norm = (s: string) => s.trim().toLowerCase()
    if (norm(first) === norm(patient.firstName) && norm(last) === norm(patient.lastName) && dob === patient.dob) return onVerified()
    const n = attempts + 1
    setAttempts(n)
    if (n >= 3) return onDenied()
    setError(`The details provided do not match. Please retry. (${3 - n} attempt${3 - n === 1 ? '' : 's'} left)`)
  }

  const box = 'h-12 rounded-xl border border-[#d8dfe5] bg-white px-3.5 text-[15px] focus:outline-none focus:ring-4 focus:border-[var(--accent)] focus:ring-[color:var(--accent-soft)]'
  const num = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n)

  return (
    <div className="px-6 py-8 bg-white min-h-full" style={{ '--accent': accent, '--accent-soft': `${accent}26` } as React.CSSProperties}>
      <div className="text-center">
        <div className="flex justify-center">
          <NetworkMark logo={form.settings.logo} />
        </div>
        <p className="mt-2 text-[13px] font-semibold" style={{ color: accent }}>
          {HEALTH_NETWORK.phone}
        </p>
      </div>
      <p className="mt-6 text-[15px] font-semibold text-ink leading-snug">{form.settings.accessDescription}</p>
      <p className="mt-2 text-[13px] text-muted">For security purposes, please confirm your details below:</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">First name</label>
          <input value={first} onChange={(e) => setFirst(e.target.value)} className={cx(box, 'w-full')} placeholder="First name" autoComplete="given-name" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Surname</label>
          <input value={last} onChange={(e) => setLast(e.target.value)} className={cx(box, 'w-full')} placeholder="Surname" autoComplete="family-name" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1.5">Date of Birth</label>
          <div className="flex gap-2">
            <input value={dd} onChange={(e) => setDd(num(e.target.value, 2))} inputMode="numeric" placeholder="DD" aria-label="Day" className={cx(box, 'w-16 text-center')} />
            <input value={mm} onChange={(e) => setMm(num(e.target.value, 2))} inputMode="numeric" placeholder="MM" aria-label="Month" className={cx(box, 'w-16 text-center')} />
            <input value={yy} onChange={(e) => setYy(num(e.target.value, 4))} inputMode="numeric" placeholder="YYYY" aria-label="Year" className={cx(box, 'w-24 text-center')} />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-rose-50 text-rose-700 text-[13px] font-medium px-3.5 py-2.5 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}
      <button
        onClick={verify}
        disabled={!ready}
        className="mt-5 w-full h-12 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: accent }}
      >
        Verify
      </button>
      <div className="mt-7 pt-5 border-t border-[#eef1f4]">
        <p className="text-[13px] font-bold text-ink">Unable to verify?</p>
        <p className="text-[13px] text-muted mt-1 leading-relaxed">{form.settings.unableToVerifyDescription}</p>
      </div>
    </div>
  )
}

/** Read-only answers grouped by page (preview summary + Q-Flow + print). */
export function AnswerSheet({ form, answers, ctx = {} }: { form: Pick<Form, 'pages'>; answers: Answers; ctx?: RecordContext }) {
  const all = allFieldsOf(form)
  return (
    <div className="space-y-6">
      {form.pages.map((p, i) => {
        const fields = p.fields.filter((f) => f.type === 'dynamic' || answers[f.id] !== undefined || visibleFields(p, answers, all).includes(f))
        if (!fields.length) return null
        return (
          <section key={p.id} className="break-inside-avoid">
            <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-brand-700 mb-2">{p.title || `Page ${i + 1}`}</h3>
            <dl className="rounded-xl border border-line divide-y divide-line overflow-hidden">
              {fields.map((f) => {
                const v = displayAnswer(f, answers[f.id], ctx)
                const flagged = f.flagOptions?.some((o) => (Array.isArray(answers[f.id]) ? (answers[f.id] as string[]).includes(o) : answers[f.id] === o))
                return (
                  <div key={f.id} className={cx('grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-1 sm:gap-6 px-4 py-3', flagged && 'bg-rose-50/70')}>
                    <dt className="text-[13px] text-muted">{f.label}</dt>
                    <dd className={cx('text-[13.5px] font-semibold whitespace-pre-wrap break-words', v ? 'text-ink' : 'text-muted/60 font-normal italic', flagged && 'text-rose-700')}>
                      {v || 'Not answered'}
                      {flagged && <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-rose-700 align-middle">Flagged</span>}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        )
      })}
    </div>
  )
}
