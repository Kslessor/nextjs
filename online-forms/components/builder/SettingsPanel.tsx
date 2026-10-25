'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Building2, ChevronRight, Hospital, ImagePlus, Search, Stethoscope, X } from 'lucide-react'
import type { Form, FormSettings, Trigger } from '@/lib/types'
import { CATEGORIES, NOTIFICATION_TEMPLATES, NOTIFICATION_TIMINGS, SERVICE_TREE, type ServiceNode } from '@/lib/seed'
import { cx } from '@/lib/util'
import { Input, Label, Select, Textarea, Toggle } from '../ui'

const TRIGGERS: Trigger[] = ['General (manual access)', 'Email', 'SMS', 'Push notification']

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="py-5 border-b border-line last:border-0">
      <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function ToggleRow({ title, hint, checked, onChange, disabled }: { title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}

const leaves = (n: ServiceNode): string[] => (n.children ? n.children.flatMap(leaves) : [n.id])

function ServiceTree({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ nexa: true, pow: true, sch: true })
  const all = leaves(SERVICE_TREE)
  const needle = q.trim().toLowerCase()

  const matches = (n: ServiceNode): boolean => !needle || n.name.toLowerCase().includes(needle) || !!n.children?.some(matches)

  const node = (n: ServiceNode, depth: number): ReactNode => {
    if (!matches(n)) return null
    const ls = leaves(n)
    const on = ls.every((l) => value.includes(l))
    const some = !on && ls.some((l) => value.includes(l))
    const isOpen = open[n.id] || !!needle
    const Icon = depth === 0 ? Building2 : n.children ? Hospital : Stethoscope
    return (
      <div key={n.id}>
        <div className="flex items-center gap-1.5 rounded-lg hover:bg-canvas py-1 pr-2" style={{ paddingLeft: depth * 16 + 4 }}>
          {n.children ? (
            <button type="button" onClick={() => setOpen({ ...open, [n.id]: !open[n.id] })} className="grid place-items-center h-5 w-5 text-muted" aria-label={isOpen ? 'Collapse' : 'Expand'}>
              <ChevronRight className={cx('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((v) => !ls.includes(v)) : Array.from(new Set([...value, ...ls])))}
            className={cx(
              'grid place-items-center h-4 w-4 rounded-[4px] border shrink-0',
              on || some ? 'bg-brand-600 border-brand-600 text-white' : 'border-[#c3ccd5] bg-white',
            )}
            aria-label={`Select ${n.name}`}
          >
            {on && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
            {some && <span className="h-0.5 w-2 bg-white rounded" />}
          </button>
          <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="text-[12.5px] truncate">{n.name}</span>
        </div>
        {n.children && isOpen && n.children.map((c) => node(c, depth + 1))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between px-3 pt-2.5 text-xs">
        <span className="text-muted">
          <strong className="text-ink">{value.length}</strong> service{value.length === 1 ? '' : 's'} selected
        </span>
        {!disabled && (
          <span className="flex gap-2 font-semibold text-brand-700">
            <button type="button" onClick={() => onChange(all)} className="hover:underline">
              Select all
            </button>
            <span className="text-line">·</span>
            <button type="button" onClick={() => onChange([])} className="hover:underline">
              Clear all
            </button>
          </span>
        )}
      </div>
      <div className="relative m-2.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search units & services..."
          className="w-full h-8 rounded-lg bg-canvas pl-8 pr-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      <div className="px-1.5 pb-2 max-h-64 overflow-y-auto scroll-thin">{node(SERVICE_TREE, 0)}</div>
    </div>
  )
}

/** Editor: Left Panel (Settings) — spec §16. */
export function SettingsPanel({ form, onChange, readOnly }: { form: Form; onChange: (f: Form) => void; readOnly?: boolean }) {
  const s = form.settings
  const set = <K extends keyof FormSettings>(k: K, v: FormSettings[K]) => onChange({ ...form, settings: { ...s, [k]: v } })

  return (
    <fieldset disabled={readOnly} className="px-5 min-w-0">
      <Section title="General">
        <div>
          <Label required htmlFor="form-title">
            Form Title
          </Label>
          <Input id="form-title" value={form.title} maxLength={80} placeholder="Untitled Form" onChange={(e) => onChange({ ...form, title: e.target.value })} invalid={!form.title.trim()} />
          <p className="flex justify-between text-xs text-muted mt-1">
            <span>{form.title.trim() ? 'Shown to patients and on the form card.' : 'A title is required before you can save.'}</span>
            <span>{form.title.length}/80</span>
          </p>
        </div>
        <div>
          <Label htmlFor="form-desc">Description</Label>
          <Textarea id="form-desc" value={form.description} rows={3} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Instructions shown under the title" />
        </div>
        <div>
          <Label required>Category</Label>
          <Select value={s.category} onChange={(e) => set('category', e.target.value as FormSettings['category'])} invalid={!s.category}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      </Section>

      <Section title="Form Type" hint="When and how this form is triggered for patients.">
        <div>
          <Label>Trigger</Label>
          <Select value={s.trigger} onChange={(e) => set('trigger', e.target.value as Trigger)}>
            {TRIGGERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="How many reminders the patient receives before the appointment.">Notification timing</Label>
          <div className="flex flex-wrap gap-1.5">
            {NOTIFICATION_TIMINGS.map((t) => {
              const on = s.notificationTiming.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('notificationTiming', on ? s.notificationTiming.filter((x) => x !== t) : NOTIFICATION_TIMINGS.filter((x) => x === t || s.notificationTiming.includes(x)))}
                  className={cx(
                    'h-8 px-3 rounded-full text-xs font-semibold ring-1 ring-inset transition-colors disabled:opacity-60',
                    on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink ring-line hover:ring-brand-300',
                  )}
                >
                  {t} before
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <Label>Notification template</Label>
          <Select value={s.notificationTemplate} onChange={(e) => set('notificationTemplate', e.target.value)}>
            {NOTIFICATION_TEMPLATES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <p className="text-xs text-muted mt-1">
            Template content is managed in Q-Flow and must include <code className="font-mono text-[11px] bg-canvas px-1 rounded">#OnlineFormsURL</code>.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint="PreAppointmentDisplay">Show in VisitPlus</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={60} value={s.displayDaysBefore} onChange={(e) => set('displayDaysBefore', Number(e.target.value))} className="w-20" />
              <span className="text-xs text-muted">days before</span>
            </div>
          </div>
          <div>
            <Label hint="Appointment card">Button label</Label>
            <Input value={s.buttonLabel} maxLength={28} onChange={(e) => set('buttonLabel', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Access">
        <ToggleRow title="Deep Link Access" hint="Accessible via SMS or email link. When off, direct-link access is blocked." checked={s.deepLink} onChange={(v) => set('deepLink', v)} disabled={readOnly} />
        <ToggleRow
          title="Allow Anonymous Submissions"
          hint="Patients can submit without verifying their name and date of birth."
          checked={s.anonymous}
          onChange={(v) => set('anonymous', v)}
          disabled={readOnly}
        />
        {!s.anonymous && (
          <>
            <div>
              <Label hint="Shown on the verification screen.">Form access description</Label>
              <Textarea rows={2} maxLength={160} value={s.accessDescription} onChange={(e) => set('accessDescription', e.target.value)} />
            </div>
            <div>
              <Label hint="What to do if verification fails.">Unable to verify text</Label>
              <Textarea rows={3} maxLength={240} value={s.unableToVerifyDescription} onChange={(e) => set('unableToVerifyDescription', e.target.value)} />
            </div>
          </>
        )}
      </Section>

      <Section title="Units & Services" hint="Q-Flow links this form to appointments in these services.">
        <ServiceTree value={s.services} onChange={(v) => set('services', v)} disabled={readOnly} />
      </Section>

      <Section title="After Submission">
        <div>
          <Label>Confirmation message</Label>
          <Textarea rows={2} value={s.confirmationMessage} onChange={(e) => set('confirmationMessage', e.target.value)} />
        </div>
        <div>
          <Label>Redirect URL (optional)</Label>
          <Input value={s.redirectUrl} placeholder="https://..." onChange={(e) => set('redirectUrl', e.target.value)} />
        </div>
      </Section>

      <Section title="Expiry">
        <div>
          <Label hint="Published forms expire automatically on this date.">Form expires on</Label>
          <Input type="date" value={s.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} />
        </div>
        <div>
          <Label hint="How long a patient’s link stays valid after the appointment (0 = until the appointment).">Link expiry</Label>
          <div className="flex gap-2">
            <Input type="number" min={0} value={s.expiryValue} onChange={(e) => set('expiryValue', Number(e.target.value))} className="w-24" />
            <Select value={s.expiryUnit} onChange={(e) => set('expiryUnit', e.target.value as 'hours' | 'days')}>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Branding">
        <div>
          <Label>Form logo</Label>
          {s.logo ? (
            <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logo} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
              <span className="flex-1" />
              {!readOnly && (
                <button type="button" onClick={() => set('logo', undefined)} className="text-muted hover:text-ink" aria-label="Remove logo">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <label className={cx('flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-[#c9d2da] text-[13px] font-semibold text-muted', !readOnly && 'cursor-pointer hover:bg-canvas hover:text-ink')}>
              <ImagePlus className="h-4 w-4" /> Click to upload logo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={readOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const r = new FileReader()
                  r.onload = () => set('logo', String(r.result))
                  r.readAsDataURL(file)
                }}
              />
            </label>
          )}
          <p className="text-xs text-muted mt-1">Displays at the top of the form. Defaults to the Q-Flow Branding Centre logo.</p>
        </div>
        <div>
          <Label>Submit button colour</Label>
          <div className="flex items-center gap-2">
            <label className="relative h-10 w-12 rounded-lg border border-line overflow-hidden cursor-pointer" style={{ backgroundColor: s.buttonColor }}>
              <input type="color" value={s.buttonColor} onChange={(e) => set('buttonColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Pick colour" />
            </label>
            <Input value={s.buttonColor} onChange={(e) => set('buttonColor', e.target.value)} className="font-mono" maxLength={7} />
          </div>
          <div className="flex gap-1.5 mt-2">
            {['#1f7577', '#2563eb', '#e6007e', '#7c3aed', '#0f766e', '#1d2430'].map((c) => (
              <button key={c} type="button" onClick={() => set('buttonColor', c)} className={cx('h-6 w-6 rounded-full ring-2 ring-offset-2', s.buttonColor === c ? 'ring-ink/30' : 'ring-transparent')} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </div>
      </Section>
    </fieldset>
  )
}
