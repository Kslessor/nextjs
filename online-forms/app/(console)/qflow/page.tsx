'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  ListOrdered,
  Printer,
  RefreshCw,
  Search,
  Ticket,
  XCircle,
  CornerDownRight,
  FileSignature,
  User2,
  Clock,
  MapPin,
} from 'lucide-react'
import type { Appointment } from '@/lib/types'
import { formStateFor, useDB, type FormState } from '@/lib/store'
import { addDays, cx, fmtDate, fmtDayLong, fmtTime, sameDay, startOfDay } from '@/lib/util'
import { PageHeader } from '@/components/Shell'
import { FormStateIcon } from '@/components/brand'
import { Button, Card, Segmented, Select, useToast } from '@/components/ui'
import { SubmissionModal } from '@/components/SubmissionModal'

type View = 'cases' | 'calendar'

const ZIGZAG = 'M0 2 ' + Array.from({ length: 100 }, (_, i) => `L${i + 1} ${i % 2 ? 4 : 0}`).join(' ')

export default function QFlowPage() {
  const db = useDB()
  const toast = useToast()
  const [view, setView] = useState<View>('cases')
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [facility, setFacility] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [viewing, setViewing] = useState<{ apptId: string; formId: string } | null>(null)

  const facilities = Array.from(new Set(db.appointments.map((a) => a.facility)))
  const patient = (id: string) => db.patients.find((p) => p.id === id)!

  const dayAppts = useMemo(
    () =>
      db.appointments
        .filter((a) => sameDay(new Date(a.start), day))
        .filter((a) => !facility || a.facility === facility)
        .filter((a) => {
          const p = patient(a.patientId)
          const n = q.trim().toLowerCase()
          return !n || `${p.firstName} ${p.lastName} ${p.mrn}`.toLowerCase().includes(n)
        })
        .sort((a, b) => a.start.localeCompare(b.start)),
    [db.appointments, day, facility, q], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const states = dayAppts.flatMap((a) => a.formIds.map((f) => formStateFor(db, a.id, f).state))
  const count = (s: FormState) => states.filter((x) => x === s).length
  const sel = db.appointments.find((a) => a.id === selected)

  const openForm = (apptId: string, formId?: string) => {
    const a = db.appointments.find((x) => x.id === apptId)!
    const fid = formId ?? a.formIds[0]
    if (!fid) return toast({ title: 'No online form linked to this case', tone: 'info' })
    setViewing({ apptId, formId: fid })
  }

  const v = viewing && {
    appt: db.appointments.find((a) => a.id === viewing.apptId)!,
    form: db.forms.find((f) => f.id === viewing.formId),
    sub: formStateFor(db, viewing.apptId, viewing.formId).submission,
  }

  return (
    <div className="px-5 sm:px-8 lg:px-10 py-8 max-w-[1500px]">
      <PageHeader
        eyebrow="Q-Flow"
        title="Service Console"
        subtitle="Online form status for every case, at a glance."
        actions={<Segmented value={view} onChange={setView} options={[{ value: 'cases', label: 'Case List', icon: <ListOrdered className="h-3.5 w-3.5" /> }, { value: 'calendar', label: 'Calendar List', icon: <CalendarDays className="h-3.5 w-3.5" /> }]} />}
      />

      <Card className="mb-5 p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setDay(addDays(day, -1))}>
            Previous
          </Button>
          <Button size="sm" onClick={() => setDay(startOfDay(new Date()))}>
            Today
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDay(addDays(day, 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="font-bold text-[15px]">{fmtDayLong(day.toISOString())}</p>
        <span className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Patient or MRN"
            className="h-9 w-48 rounded-lg border border-line pl-9 pr-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <div className="w-60">
          <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="h-9">
            <option value="">All facilities</option>
            {facilities.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </div>
        <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => toast({ title: 'Refreshed', tone: 'info' })}>
          Refresh
        </Button>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Forms linked" value={states.length} hint="On this day's cases" />
        <Stat label="Not yet completed" value={count('pending')} state="pending" />
        <Stat label="Completed" value={count('complete')} state="complete" />
        <Stat label="Action required" value={count('action')} state="action" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {view === 'cases' ? (
          <CaseList appts={dayAppts} selected={selected} onSelect={setSelected} onOpen={openForm} />
        ) : (
          <CalendarList appts={dayAppts} selected={selected} onSelect={setSelected} onOpen={openForm} />
        )}
        <SoftKeys appt={sel} onOpen={openForm} />
      </div>

      <SubmissionModal
        open={!!v}
        onClose={() => setViewing(null)}
        form={v ? v.form : undefined}
        submission={v ? v.sub : undefined}
        appointment={v ? v.appt : undefined}
        patient={v ? patient(v.appt.patientId) : undefined}
      />
    </div>
  )
}

function Stat({ label, value, state }: { label: string; value: number; hint?: string; state?: FormState }) {
  return (
    <Card className="px-4 py-3.5 flex items-center gap-3.5">
      {state ? (
        <FormStateIcon state={state} />
      ) : (
        <span className="grid place-items-center h-7 w-7 rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
          <ClipboardList className="h-4 w-4" />
        </span>
      )}
      <div>
        <p className="text-[22px] font-extrabold leading-none tabular-nums">{value}</p>
        <p className="text-xs text-muted mt-1">{label}</p>
      </div>
    </Card>
  )
}

function useCaseHelpers() {
  const db = useDB()
  return {
    patient: (id: string) => db.patients.find((p) => p.id === id)!,
    icons: (a: Appointment, onOpen: (apptId: string, formId: string) => void) =>
      a.formIds.length ? (
        a.formIds.map((fid) => {
          const st = formStateFor(db, a.id, fid).state
          const title = db.forms.find((f) => f.id === fid)?.title ?? 'Form'
          return (
            <button
              key={fid}
              onClick={(e) => {
                e.stopPropagation()
                onOpen(a.id, fid)
              }}
              className="rounded-md hover:scale-110 transition-transform"
              aria-label={`Open ${title}`}
              title={title}
            >
              <FormStateIcon state={st} />
            </button>
          )
        })
      ) : (
        <FormStateIcon state="none" />
      ),
  }
}

function CaseList({ appts, selected, onSelect, onOpen }: { appts: Appointment[]; selected: string | null; onSelect: (id: string) => void; onOpen: (a: string, f: string) => void }) {
  const { patient, icons } = useCaseHelpers()
  const groups = appts.reduce<Record<string, Appointment[]>>((g, a) => ((g[`${a.clinic} ${a.service !== 'Consultation' ? a.service : ''}`.trim()] ??= []).push(a), g), {})
  if (!appts.length) return <EmptyDay />
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([clinic, list]) => (
        <Card key={clinic} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-gradient-to-r from-brand-50/70 to-transparent">
            <h3 className="font-bold text-brand-800">
              {clinic} <span className="font-medium text-muted text-sm">({list.length} case{list.length === 1 ? '' : 's'})</span>
            </h3>
            <span className="text-xs text-muted">{list[0].facility}</span>
          </div>
          <div className="divide-y divide-line">
            {list.map((a) => {
              const p = patient(a.patientId)
              const done = a.checkedIn
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(a.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(a.id)}
                  className={cx('grid grid-cols-[36px_84px_96px_1fr_auto] items-center gap-3 px-5 py-3 cursor-pointer transition-colors', selected === a.id ? 'bg-brand-50/70' : 'hover:bg-canvas')}
                >
                  <span className={cx('grid place-items-center h-7 w-7 rounded-lg text-xs', done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#e8ecf0] text-muted')} title={done ? 'Checked in' : 'Booked'}>
                    <User2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{fmtTime(a.start)}</span>
                  <span className="text-[13px] font-mono text-muted">{p.mrn}</span>
                  <span className="text-sm font-semibold truncate">
                    {p.firstName} {p.lastName}
                    <span className="ml-2 text-xs font-normal text-muted">{a.provider}</span>
                  </span>
                  <span className="flex items-center gap-1.5">{icons(a, onOpen)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
      <Legend />
    </div>
  )
}

function CalendarList({ appts, selected, onSelect, onOpen }: { appts: Appointment[]; selected: string | null; onSelect: (id: string) => void; onOpen: (a: string, f: string) => void }) {
  const { patient, icons } = useCaseHelpers()
  if (!appts.length) return <EmptyDay />
  const rows: ({ kind: 'gap'; from: string; to: string } | { kind: 'appt'; a: Appointment } | { kind: 'break' })[] = []
  const first = new Date(appts[0].start)
  const dayStart = startOfDay(first)
  rows.push({ kind: 'gap', from: dayStart.toISOString(), to: first.toISOString() })
  appts.forEach((a, i) => {
    rows.push({ kind: 'appt', a })
    const next = appts[i + 1]
    if (next) {
      const end = new Date(a.start).getTime() + a.durationMin * 60000
      if (new Date(next.start).getTime() - end > 45 * 60000) rows.push({ kind: 'break' })
    }
  })
  const last = appts[appts.length - 1]
  rows.push({ kind: 'gap', from: new Date(new Date(last.start).getTime() + last.durationMin * 60000).toISOString(), to: addDays(dayStart, 1).toISOString() })

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm">
          <Clock className="h-4 w-4 text-brand-300" /> Working Hours: 12:00 AM – 12:00 AM
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
              <th className="px-5 py-2.5 w-24">From</th>
              <th className="px-3 py-2.5 w-24">To</th>
              <th className="px-3 py-2.5">Details</th>
              <th className="px-3 py-2.5 w-28">Form</th>
              <th className="px-5 py-2.5 w-40">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.kind === 'break')
                return (
                  <tr key={i} aria-hidden>
                    <td colSpan={5} className="h-4 p-0">
                      <svg className="w-full h-4 text-line" preserveAspectRatio="none" viewBox="0 0 100 4">
                        <path d={ZIGZAG} fill="none" stroke="currentColor" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </td>
                  </tr>
                )
              if (r.kind === 'gap')
                return (
                  <tr key={i} className="border-b border-line text-muted">
                    <td className="px-5 py-2.5 tabular-nums">{fmtTime(r.from)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtTime(r.to)}</td>
                    <td colSpan={3} className="px-3 py-2.5 text-center text-xs italic bg-[repeating-linear-gradient(135deg,transparent_0_6px,#eef1f4_6px_7px)]">
                      no time slots were set for these working hours
                    </td>
                  </tr>
                )
              const a = r.a
              const p = patient(a.patientId)
              return (
                <tr key={a.id} onClick={() => onSelect(a.id)} className={cx('border-b border-line cursor-pointer', selected === a.id ? 'bg-brand-50/70' : 'hover:bg-canvas')}>
                  <td className="px-5 py-3 font-semibold tabular-nums">{fmtTime(a.start)}</td>
                  <td className="px-3 py-3 tabular-nums text-muted">{fmtTime(new Date(new Date(a.start).getTime() + a.durationMin * 60000).toISOString())}</td>
                  <td className="px-3 py-3">
                    <span className={cx('inline-flex items-center rounded-md px-1.5 h-5 text-[11px] font-bold mr-2', a.checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-[#e8ecf0] text-muted')}>
                      {a.checkedIn ? 'IN' : 'BKD'}
                    </span>
                    <span className="font-semibold text-brand-700">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-muted"> ({p.mrn})</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">{icons(a, onOpen)}</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{a.clinic}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <div className="mt-5">
        <Legend />
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
      <span className="font-semibold text-ink">Form icon</span>
      <span className="flex items-center gap-2">
        <FormStateIcon state="pending" size="sm" /> Not yet completed
      </span>
      <span className="flex items-center gap-2">
        <FormStateIcon state="complete" size="sm" /> Completed — no action
      </span>
      <span className="flex items-center gap-2">
        <FormStateIcon state="action" size="sm" /> Completed — action required
      </span>
    </div>
  )
}

function EmptyDay() {
  return (
    <Card className="py-20 text-center">
      <CalendarDays className="mx-auto h-10 w-10 text-muted/50" />
      <p className="mt-3 font-semibold">No cases on this day</p>
      <p className="text-sm text-muted mt-1">Use Previous / Next to browse other clinic days.</p>
    </Card>
  )
}

function SoftKeys({ appt, onOpen }: { appt?: Appointment; onOpen: (a: string, f?: string) => void }) {
  const db = useDB()
  const toast = useToast()
  if (!appt)
    return (
      <Card className="p-6 text-center xl:sticky xl:top-6">
        <span className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-canvas text-muted">
          <CornerDownRight className="h-5 w-5" />
        </span>
        <p className="mt-3 font-semibold text-sm">Select a case</p>
        <p className="text-[13px] text-muted mt-1">Case details and soft keys appear here, including the NEXA Online Form key.</p>
      </Card>
    )
  const p = db.patients.find((x) => x.id === appt.patientId)!
  const legacy = (label: string) => () => toast({ title: label, body: 'Existing Q-Flow soft key — outside Online Forms v1.0.', tone: 'info' })
  const KEYS = [
    { label: 'Enqueue', icon: ListOrdered, on: legacy('Enqueue') },
    { label: 'Document', icon: FileText, on: legacy('Document') },
    { label: 'Print ticket', icon: Ticket, on: legacy('Print ticket') },
    { label: 'Follow-up', icon: CornerDownRight, on: legacy('Follow-up') },
    { label: 'Brochure', icon: BookOpen, on: legacy('Brochure') },
    { label: 'NEXA Online Form', icon: ClipboardList, on: () => onOpen(appt.id), highlight: true },
    { label: 'Outcome Form', icon: FileSignature, on: legacy('Outcome Form') },
    { label: 'Cancel case', icon: XCircle, on: legacy('Cancel case'), danger: true },
    { label: 'Print invitation', icon: Printer, on: legacy('Print invitation') },
  ]
  return (
    <div className="space-y-4 xl:sticky xl:top-6 animate-fade-in">
      <Card className="p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted">Case</p>
        <p className="text-lg font-bold mt-1">
          {p.firstName} {p.lastName}
        </p>
        <p className="text-xs text-muted">
          MRN {p.mrn} · DOB {fmtDate(p.dob)}
        </p>
        <div className="mt-3 space-y-1.5 text-[13px]">
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted" /> {fmtTime(appt.start)} · {appt.durationMin} min
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted" /> {appt.clinic}, {appt.location}
          </p>
          <p className="flex items-center gap-2">
            <User2 className="h-3.5 w-3.5 text-muted" /> {appt.provider}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-2">Online Forms</p>
          {appt.formIds.length === 0 && <p className="text-[13px] text-muted">No forms linked to this case.</p>}
          <div className="space-y-1.5">
            {appt.formIds.map((fid) => {
              const { state, submission } = formStateFor(db, appt.id, fid)
              const f = db.forms.find((x) => x.id === fid)
              return (
                <button key={fid} onClick={() => onOpen(appt.id, fid)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-canvas">
                  <FormStateIcon state={state} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold truncate">{f?.title ?? submission?.formTitle}</span>
                    <span className={cx('block text-xs', state === 'action' ? 'text-rose-600 font-semibold' : 'text-muted')}>
                      {state === 'pending' ? 'Not yet submitted' : state === 'action' ? 'Action required' : `Submitted ${fmtDate(submission?.submittedAt)}`}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </button>
              )
            })}
          </div>
        </div>
      </Card>
      <Card className="p-2">
        {KEYS.map((k) => (
          <button
            key={k.label}
            onClick={k.on}
            className={cx(
              'flex w-full items-center gap-3 rounded-lg px-3 h-10 text-[13px] font-semibold text-left transition-colors',
              k.highlight ? 'bg-brand-600 text-white hover:bg-brand-700 my-1' : k.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink hover:bg-canvas',
            )}
          >
            <k.icon className={cx('h-4 w-4', k.highlight ? 'text-white' : k.danger ? 'text-rose-500' : 'text-muted')} />
            {k.label}
          </button>
        ))}
      </Card>
    </div>
  )
}
