'use client'

import { useSyncExternalStore } from 'react'
import type { AnswerValue, AuditEntry, Channel, DB, Form, Page, Submission } from './types'
import { buildSeed, SERVICE_TREE, USERS, type ServiceNode } from './seed'
import { flaggedAnswers } from './logic'
import { clone, uid } from './util'

/**
 * Prototype persistence: the whole dataset lives in localStorage so every
 * surface (Editor, VisitPlus, Q-Flow) shares one source of truth in the
 * browser. Swap this module for API calls when wiring to the real backend.
 */
const KEY = 'nexa-online-forms:v3'

let db: DB | null = null
const listeners = new Set<() => void>()

function load(): DB {
  if (db) return db
  if (typeof window === 'undefined') return (db = buildSeed())
  try {
    const raw = window.localStorage.getItem(KEY)
    db = raw ? (JSON.parse(raw) as DB) : buildSeed()
  } catch {
    db = buildSeed()
  }
  db = expireForms(db)
  return db
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

function commit(next: DB) {
  db = next
  persist()
  listeners.forEach((l) => l())
}

function mutate(fn: (d: DB) => void) {
  const next = clone(load())
  fn(next)
  commit(next)
}

function expireForms(d: DB): DB {
  const now = new Date().toISOString()
  let changed = false
  for (const f of d.forms) {
    if (f.status === 'published' && f.expiresAt && f.expiresAt < now) {
      f.status = 'expired'
      f.expiredAt = f.expiresAt
      changed = true
    }
  }
  return changed ? { ...d } : d
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      db = null
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

let serverSnapshot: DB | null = null
const getServerSnapshot = () => (serverSnapshot ??= buildSeed())

export function useDB(): DB {
  return useSyncExternalStore(subscribe, load, getServerSnapshot)
}

export function getDB(): DB {
  return load()
}

/* ------------------------------------------------------------------ */

function currentUser(d: DB) {
  return d.currentUser
}

function log(d: DB, form: Pick<Form, 'id' | 'title'>, action: string, changes?: AuditEntry['changes']) {
  d.audit.unshift({ id: uid('aud'), formId: form.id, formTitle: form.title, user: currentUser(d), at: new Date().toISOString(), action, changes })
}

const SETTING_LABELS: Partial<Record<keyof Form['settings'], string>> = {
  category: 'Category',
  trigger: 'Trigger',
  notificationTiming: 'Notification timing',
  notificationTemplate: 'Notification template',
  deepLink: 'Deep link access',
  anonymous: 'Anonymous submissions',
  services: 'Units & services',
  confirmationMessage: 'Confirmation message',
  redirectUrl: 'Redirect URL',
  buttonColor: 'Submit button colour',
  buttonLabel: 'VisitPlus button label',
  expiryValue: 'Link expiry',
  expiryUnit: 'Link expiry unit',
  expiresOn: 'Form expires on',
  displayDaysBefore: 'Display days before',
  accessDescription: 'Access description',
  unableToVerifyDescription: 'Unable to verify text',
}

const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v ?? '') || '—')

export function diffForm(prev: Form | undefined, next: Form): NonNullable<AuditEntry['changes']> {
  const changes: NonNullable<AuditEntry['changes']> = []
  if (!prev) return changes
  if (prev.title !== next.title) changes.push({ field: 'Title', from: prev.title, to: next.title })
  if (prev.description !== next.description) changes.push({ field: 'Description', from: prev.description || '—', to: next.description || '—' })
  for (const k of Object.keys(SETTING_LABELS) as (keyof Form['settings'])[]) {
    const a = show(prev.settings[k])
    const b = show(next.settings[k])
    if (a !== b) changes.push({ field: SETTING_LABELS[k]!, from: a, to: b })
  }
  const pf = prev.pages.flatMap((p) => p.fields).length
  const nf = next.pages.flatMap((p) => p.fields).length
  if (prev.pages.length !== next.pages.length) changes.push({ field: 'Pages', from: String(prev.pages.length), to: String(next.pages.length) })
  if (pf !== nf) changes.push({ field: 'Fields', from: String(pf), to: String(nf) })
  else if (JSON.stringify(prev.pages) !== JSON.stringify(next.pages)) changes.push({ field: 'Questions', from: 'previous', to: 'edited' })
  return changes
}

export const actions = {
  setUser(email: string) {
    mutate((d) => {
      d.currentUser = email
    })
  },

  reset() {
    commit(buildSeed())
  },

  saveForm(form: Form): Form {
    const saved: Form = { ...clone(form), updatedAt: new Date().toISOString() }
    mutate((d) => {
      const i = d.forms.findIndex((f) => f.id === form.id)
      if (i >= 0) {
        const changes = diffForm(d.forms[i], saved)
        d.forms[i] = saved
        log(d, saved, 'Saved draft', changes.length ? changes : undefined)
      } else {
        d.forms.unshift(saved)
        log(d, saved, 'Created form')
      }
    })
    return saved
  },

  duplicateForm(id: string): Form | undefined {
    const src = load().forms.find((f) => f.id === id)
    if (!src) return
    const copy = duplicate(src, currentUser(load()))
    mutate((d) => {
      d.forms.unshift(copy)
      log(d, copy, `Duplicated from “${src.title}”`)
    })
    return copy
  },

  publishForm(id: string) {
    mutate((d) => {
      const f = d.forms.find((x) => x.id === id)
      if (!f) return
      const now = new Date().toISOString()
      f.status = 'published'
      f.publishedAt = now
      f.unpublishedAt = undefined
      f.expiresAt = f.settings.expiresOn ? new Date(`${f.settings.expiresOn}T23:59:59`).toISOString() : undefined
      f.updatedAt = now
      linkToAppointments(d, f)
      log(d, f, 'Published')
    })
  },

  unpublishForm(id: string) {
    mutate((d) => {
      const f = d.forms.find((x) => x.id === id)
      if (!f) return
      f.status = 'unpublished'
      f.unpublishedAt = new Date().toISOString()
      log(d, f, 'Unpublished')
    })
  },

  archiveForm(id: string) {
    mutate((d) => {
      const f = d.forms.find((x) => x.id === id)
      if (!f) return
      f.status = 'archived'
      f.archivedAt = new Date().toISOString()
      log(d, f, 'Archived')
    })
  },

  deleteForm(id: string) {
    mutate((d) => {
      const f = d.forms.find((x) => x.id === id)
      if (!f) return
      d.forms = d.forms.filter((x) => x.id !== id)
      d.appointments.forEach((a) => (a.formIds = a.formIds.filter((x) => x !== id)))
      log(d, f, 'Deleted')
    })
  },

  submit(formId: string, appointmentId: string | undefined, answers: Record<string, AnswerValue>, channel: Channel): Submission | undefined {
    let created: Submission | undefined
    mutate((d) => {
      const f = d.forms.find((x) => x.id === formId)
      if (!f) return
      const flags = flaggedAnswers(f.pages, answers)
      created = {
        id: uid('sub'),
        formId,
        formTitle: f.title,
        formVersion: f.version,
        appointmentId,
        submittedAt: new Date().toISOString(),
        channel,
        answers,
        pages: clone(f.pages),
        actionRequired: flags.length > 0,
        actionNote: flags.map((x) => `${x.field.label} — ${x.value}`).join('\n') || undefined,
      }
      d.submissions.unshift(created)
    })
    return created
  },

  resolveAction(subId: string) {
    mutate((d) => {
      const s = d.submissions.find((x) => x.id === subId)
      if (!s) return
      s.actionRequired = false
      s.actionResolvedAt = new Date().toISOString()
      s.actionResolvedBy = currentUser(d)
    })
  },

  snoozeCta(apptId: string, hours: number) {
    mutate((d) => {
      d.ctaSnoozedUntil[apptId] = new Date(Date.now() + hours * 3600e3).toISOString()
    })
  },

  checkIn(apptId: string) {
    mutate((d) => {
      const a = d.appointments.find((x) => x.id === apptId)
      if (a) a.checkedIn = true
    })
  },
}

/** Q-Flow links a form to every appointment in its Units & Services (spec §1.3.1). */
function linkToAppointments(d: DB, f: Form) {
  const clinics = new Set(serviceNames(f.settings.services))
  const now = Date.now()
  for (const a of d.appointments) {
    if (!clinics.has(a.clinic) || a.formIds.includes(f.id)) continue
    const future = new Date(a.start).getTime() > now
    if (f.settings.category === 'Pre-Appointment' && !future) continue
    if (f.settings.category === 'Post-Appointment' && future) continue
    a.formIds.push(f.id)
  }
}

export function serviceNames(ids: string[]): string[] {
  const out: string[] = []
  const walk = (n: ServiceNode) => {
    if (ids.includes(n.id) && !n.children) out.push(n.name)
    n.children?.forEach(walk)
  }
  walk(SERVICE_TREE)
  return out
}

export function duplicate(src: Form, user: string): Form {
  const pageMap = new Map<string, string>()
  const fieldMap = new Map<string, string>()
  const pages: Page[] = src.pages.map((p) => {
    const pid = uid('pg')
    pageMap.set(p.id, pid)
    return {
      ...clone(p),
      id: pid,
      fields: p.fields.map((f) => {
        const fid = uid('fld')
        fieldMap.set(f.id, fid)
        return { ...clone(f), id: fid }
      }),
    }
  })
  for (const p of pages)
    for (const f of p.fields) {
      if (f.condition) f.condition.sourceId = fieldMap.get(f.condition.sourceId) ?? f.condition.sourceId
      f.jumps = f.jumps?.map((j) => ({ ...j, id: uid('jmp'), targetPageId: pageMap.get(j.targetPageId) ?? j.targetPageId }))
    }
  const now = new Date().toISOString()
  return {
    ...clone(src),
    id: uid('frm'),
    title: `${src.title} (Copy)`,
    status: 'draft',
    version: 1,
    pages,
    createdBy: user,
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
    unpublishedAt: undefined,
    expiresAt: undefined,
    expiredAt: undefined,
    archivedAt: undefined,
  }
}

export function userFor(email: string) {
  return USERS.find((u) => u.email === email) ?? USERS[0]
}

/** The grey / green / red icon logic shared by the Case List and Calendar List. */
export type FormState = 'none' | 'pending' | 'complete' | 'action'

export function formStateFor(d: DB, apptId: string, formId: string): { state: FormState; submission?: Submission } {
  const s = d.submissions.find((x) => x.appointmentId === apptId && x.formId === formId)
  if (!s) return { state: 'pending' }
  return { state: s.actionRequired ? 'action' : 'complete', submission: s }
}
