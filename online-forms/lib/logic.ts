import type { AnswerValue, Appointment, DynamicKey, Field, Form, Page, Patient } from './types'
import { canJump, isChoice } from './fields'
import { fmtDate, fmtDateTime } from './util'

export type Answers = Record<string, AnswerValue>

const isEmpty = (v: AnswerValue | undefined) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

const asText = (v: AnswerValue | undefined): string =>
  v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v)

export function conditionMet(field: Field, answers: Answers, allFields: Field[]): boolean {
  const c = field.condition
  if (!c) return true
  const source = allFields.find((f) => f.id === c.sourceId)
  if (!source) return true // dangling rule: fail open so the field is never lost
  const v = answers[source.id]
  const target = c.value.trim().toLowerCase()
  const equals = Array.isArray(v)
    ? v.some((x) => x.toLowerCase() === target)
    : asText(v).trim().toLowerCase() === target
  switch (c.operator) {
    case 'equals':
      return equals
    case 'not_equals':
      return !isEmpty(v) && !equals
    case 'contains':
      return Array.isArray(v)
        ? v.some((x) => x.toLowerCase().includes(target))
        : asText(v).toLowerCase().includes(target)
  }
}

export function allFieldsOf(form: { pages: Page[] }): Field[] {
  return form.pages.flatMap((p) => p.fields)
}

export function visibleFields(page: Page, answers: Answers, all: Field[]): Field[] {
  return page.fields.filter((f) => conditionMet(f, answers, all))
}

/** Index of the next page, honouring page-jump rules (first matching rule wins). -1 = end. */
export function nextPageIndex(form: { pages: Page[] }, index: number, answers: Answers): number {
  const page = form.pages[index]
  const all = allFieldsOf(form)
  for (const f of visibleFields(page, answers, all)) {
    if (!canJump(f.type) || !f.jumps?.length) continue
    const v = asText(answers[f.id])
    const rule = f.jumps.find((j) => j.option === v)
    if (rule) {
      const t = form.pages.findIndex((p) => p.id === rule.targetPageId)
      if (t >= 0 && t !== index) return t
    }
  }
  return index + 1 < form.pages.length ? index + 1 : -1
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[\d\s()-]{8,16}$/

export function validateField(f: Field, v: AnswerValue | undefined): string | null {
  if (f.type === 'dynamic') return null
  if (isEmpty(v)) {
    if (!f.required) return null
    if (f.type === 'checkboxes') return 'Select at least one option'
    if (f.type === 'radio' || f.type === 'dropdown' || f.type === 'smiley') return 'Please select an option'
    if (f.type === 'short_text' || f.type === 'long_text') return 'Please enter detail'
    return 'This field is required'
  }
  const s = asText(v)
  switch (f.type) {
    case 'short_text':
    case 'long_text':
      if (f.maxLength && s.length > f.maxLength) return `Keep this under ${f.maxLength} characters`
      return null
    case 'number': {
      if (!/^-?\d+(\.\d+)?$/.test(s.trim())) return 'Enter a number'
      const n = Number(s)
      if (f.min !== undefined && n < f.min) return `Enter a number of at least ${f.min}`
      if (f.max !== undefined && n > f.max) return `Enter a number no greater than ${f.max}`
      return null
    }
    case 'email':
      return EMAIL_RE.test(s.trim()) ? null : 'Enter a valid email, e.g. name@domain.com'
    case 'phone':
      return PHONE_RE.test(s.trim()) ? null : 'Enter a valid phone number'
    case 'date':
      if (isNaN(new Date(s).getTime())) return 'Enter a valid date'
      if (f.minDate && s < f.minDate) return `Choose a date on or after ${fmtDate(f.minDate)}`
      if (f.maxDate && s > f.maxDate) return `Choose a date on or before ${fmtDate(f.maxDate)}`
      return null
    case 'file': {
      const name = s.split('|')[0]
      const types = (f.fileTypes ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      if (types.length && !types.some((t) => name.toLowerCase().endsWith(t))) return `Upload a ${types.join(', ')} file`
      return null
    }
    default:
      return null
  }
}

export function validatePage(page: Page, answers: Answers, all: Field[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of visibleFields(page, answers, all)) {
    const e = validateField(f, answers[f.id])
    if (e) errors[f.id] = e
  }
  return errors
}

/** Answers that match a field's flag options mean staff must follow up (red icon). */
export function flaggedAnswers(pages: Page[], answers: Answers): { field: Field; value: string }[] {
  const out: { field: Field; value: string }[] = []
  for (const f of pages.flatMap((p) => p.fields)) {
    if (!isChoice(f.type) || !f.flagOptions?.length) continue
    const v = answers[f.id]
    const vals = Array.isArray(v) ? v : v ? [String(v)] : []
    const hit = vals.filter((x) => f.flagOptions!.includes(x))
    if (hit.length) out.push({ field: f, value: hit.join(', ') })
  }
  return out
}

export interface RecordContext {
  patient?: Patient
  appointment?: Appointment
}

export function dynamicValue(key: DynamicKey | undefined, ctx: RecordContext): string {
  const { patient: p, appointment: a } = ctx
  switch (key) {
    case 'patient_name':
      return p ? `${p.firstName} ${p.lastName}` : 'Harry Manson'
    case 'date_of_birth':
      return p ? fmtDate(p.dob) : '04 Feb 1988'
    case 'clinic_service':
      return a ? `${a.clinic} · ${a.service}` : 'Cardiology Outpatients · Consultation'
    case 'appointment_date':
      return a ? fmtDateTime(a.start) : 'Fri 19 Jun 2026, 9:00 AM'
    case 'provider_name':
      return a?.provider ?? 'Dr. Sarah Smith'
    case 'provider_number':
      return a?.providerNumber ?? '2401587T'
    case 'medicare_items':
      return a?.medicareItems ?? '104 · Specialist initial consultation'
    default:
      return ''
  }
}

export function displayAnswer(f: Field, v: AnswerValue | undefined, ctx: RecordContext = {}): string {
  if (f.type === 'dynamic') return dynamicValue(f.dynamicKey, ctx)
  if (isEmpty(v)) return ''
  if (f.type === 'date') return fmtDate(String(v))
  if (f.type === 'file') return String(v).split('|')[0]
  return asText(v)
}

/** Publish-time checks so a broken form never reaches patients. */
export function publishProblems(form: Form): string[] {
  const p: string[] = []
  if (!form.title.trim()) p.push('Add a form title in Settings.')
  if (!form.settings.category) p.push('Choose a category in Settings.')
  const all = allFieldsOf(form)
  if (all.filter((f) => f.type !== 'dynamic').length === 0) p.push('Add at least one question.')
  form.pages.forEach((pg, i) => {
    if (pg.fields.length === 0) p.push(`${pg.title || `Page ${i + 1}`} has no fields.`)
  })
  for (const f of all) {
    if (!f.label.trim()) p.push('Every field needs a label.')
    if ((f.type === 'dropdown' || f.type === 'radio' || f.type === 'checkboxes') && (f.options ?? []).filter((o) => o.trim()).length < 2)
      p.push(`“${f.label}” needs at least two options.`)
  }
  return Array.from(new Set(p))
}
