'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BellRing, ChevronLeft, Clock, Mail, MapPin, MessageSquareText, Navigation, Phone as PhoneIcon, Smartphone, User2, Stethoscope, X, ArrowRight, Info, CheckCircle2, Globe } from 'lucide-react'
import type { Appointment, Channel, Form, Patient } from '@/lib/types'
import { actions, formStateFor, useDB } from '@/lib/store'
import { HEALTH_NETWORK } from '@/lib/seed'
import { cx, fmtDate, fmtTime, withBase } from '@/lib/util'
import { PageHeader } from '@/components/Shell'
import { Phone } from '@/components/Phone'
import { PatientJourney, availability } from '@/components/PatientJourney'
import { FormRunner } from '@/components/FormRunner'
import { Card, Select, Button, useToast } from '@/components/ui'

type Entry = 'app' | 'push' | 'sms' | 'email'

type Screen =
  | { name: 'home' }
  | { name: 'details'; apptId: string }
  | { name: 'lock' }
  | { name: 'inbox' }
  | { name: 'chooser'; apptId: string; formId: string }
  | { name: 'form'; apptId: string; formId: string; channel: Channel; auth: boolean }
  | { name: 'view'; apptId: string; formId: string }
  | { name: 'checkedin'; apptId: string }

const ENTRIES: { id: Entry; label: string; icon: typeof Smartphone; spec: string }[] = [
  { id: 'app', label: 'VisitPlus app', icon: Smartphone, spec: '§4 Form button · §5 CTA' },
  { id: 'push', label: 'Push notification', icon: BellRing, spec: '§2.3.1 Deep-linked push' },
  { id: 'sms', label: 'SMS link', icon: MessageSquareText, spec: '§2.3.2 #OnlineFormsURL' },
  { id: 'email', label: 'Email link', icon: Mail, spec: '§2.3.2 #OnlineFormsURL' },
]

const CTA_SNOOZE_HOURS = 4

export default function VisitPlusPage() {
  const db = useDB()
  const toast = useToast()
  const candidates = db.patients.filter((p) => db.appointments.some((a) => a.patientId === p.id && a.formIds.length))
  const [patientId, setPatientId] = useState('pt_harry')
  const [entry, setEntry] = useState<Entry>('app')
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [cta, setCta] = useState<string | null>(null)
  const [run, setRun] = useState(0)

  const patient = db.patients.find((p) => p.id === patientId) ?? db.patients[0]
  const appts = db.appointments.filter((a) => a.patientId === patient.id).sort((a, b) => b.start.localeCompare(a.start))
  const upcoming = appts.filter((a) => new Date(a.start).getTime() > Date.now() - 3600e3).sort((a, b) => a.start.localeCompare(b.start))
  // The appointment + form a reminder would be about: first pending pre-appointment form, else any pending form.
  const target = useMemo(() => {
    for (const a of [...upcoming, ...appts])
      for (const fid of a.formIds) {
        const f = db.forms.find((x) => x.id === fid)
        if (f?.status === 'published' && !formStateFor(db, a.id, fid).submission) return { appt: a, form: f }
      }
    const a = appts.find((x) => x.formIds.length)
    return a ? { appt: a, form: db.forms.find((f) => f.id === a.formIds[0]) } : null
  }, [db, appts, upcoming])

  const start = (e: Entry, pid = patientId) => {
    setEntry(e)
    setPatientId(pid)
    setCta(null)
    setRun((r) => r + 1)
    setScreen(e === 'app' ? { name: 'home' } : e === 'push' ? { name: 'lock' } : { name: 'inbox' })
  }

  const openForm = (a: Appointment, fid: string, channel: Channel, auth: boolean) => {
    setRun((r) => r + 1)
    setScreen({ name: 'form', apptId: a.id, formId: fid, channel, auth })
  }

  const checkIn = (a: Appointment) => {
    const pre = a.formIds.find((fid) => db.forms.find((f) => f.id === fid)?.settings.category === 'Pre-Appointment' && !formStateFor(db, a.id, fid).submission)
    const snoozed = db.ctaSnoozedUntil[a.id] && db.ctaSnoozedUntil[a.id] > new Date().toISOString()
    if (pre && !snoozed) return setCta(a.id)
    actions.checkIn(a.id)
    setScreen({ name: 'checkedin', apptId: a.id })
  }

  const home = () => setScreen({ name: 'home' })
  const s = screen
  const formFor = (id: string) => db.forms.find((f) => f.id === id)
  const apptFor = (id: string) => db.appointments.find((a) => a.id === id)!

  let content: ReactNode
  let dark = false
  switch (s.name) {
    case 'home':
      content = <AppHome patient={patient} appts={appts} onOpen={(a, f) => openForm(a, f, 'VisitPlus', true)} onView={(a, f) => setScreen({ name: 'view', apptId: a.id, formId: f })} onDetails={(a) => setScreen({ name: 'details', apptId: a.id })} onCheckIn={checkIn} />
      break
    case 'details':
      content = <AppDetails appt={apptFor(s.apptId)} patient={patient} onBack={home} onOpen={(a, f) => openForm(a, f, 'VisitPlus', true)} onView={(a, f) => setScreen({ name: 'view', apptId: a.id, formId: f })} onCheckIn={checkIn} />
      break
    case 'lock':
      dark = true
      content = <LockScreen target={target} onTap={() => target?.form && openForm(target.appt, target.form.id, 'Push', true)} />
      break
    case 'inbox':
      content =
        entry === 'sms' ? (
          <SmsScreen patient={patient} target={target} onLink={() => target?.form && setScreen({ name: 'chooser', apptId: target.appt.id, formId: target.form.id })} />
        ) : (
          <EmailScreen patient={patient} target={target} onLink={() => target?.form && setScreen({ name: 'chooser', apptId: target.appt.id, formId: target.form.id })} />
        )
      break
    case 'chooser':
      content = (
        <OpenWithSheet
          url={`forms.nexa.com.au/f/?t=${apptFor(s.apptId).token}`}
          onApp={() => openForm(apptFor(s.apptId), s.formId, entry === 'sms' ? 'SMS' : 'Email', true)}
          onBrowser={() => openForm(apptFor(s.apptId), s.formId, entry === 'sms' ? 'SMS' : 'Email', false)}
          behind={entry === 'sms' ? <SmsScreen patient={patient} target={target} onLink={() => {}} /> : <EmailScreen patient={patient} target={target} onLink={() => {}} />}
        />
      )
      break
    case 'form': {
      const a = apptFor(s.apptId)
      const inBrowser = !s.auth
      const journey = (
        <PatientJourney
          key={run}
          form={formFor(s.formId)}
          appt={a}
          patient={patient}
          channel={s.channel}
          authenticated={s.auth}
          viaLink={s.channel === 'SMS' || s.channel === 'Email'}
          onClose={() => (entry === 'app' || entry === 'push' || s.auth ? home() : setScreen({ name: 'inbox' }))}
        />
      )
      content = inBrowser ? <MiniBrowser url={`forms.nexa.com.au/f/?t=${a.token}`}>{journey}</MiniBrowser> : <div className="absolute inset-0 overflow-y-auto scroll-thin">{journey}</div>
      break
    }
    case 'view': {
      const sub = formStateFor(db, s.apptId, s.formId).submission
      content = sub ? (
        <div className="absolute inset-0 overflow-y-auto scroll-thin">
          <FormRunner form={{ ...formFor(s.formId)!, pages: sub.pages }} readOnly={sub.answers} ctx={{ patient, appointment: apptFor(s.apptId) }} onClose={home} />
        </div>
      ) : null
      break
    }
    case 'checkedin':
      content = <CheckedIn appt={apptFor(s.apptId)} onDone={home} />
      break
  }

  const ctaAppt = cta ? apptFor(cta) : undefined
  const ctaForm = ctaAppt?.formIds.map(formFor).find((f) => f?.settings.category === 'Pre-Appointment')

  return (
    <div className="px-5 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      <PageHeader
        eyebrow="Patient experience"
        title="VisitPlus & browser journeys"
        subtitle="Walk through exactly what patients see. Submissions land in the Q-Flow Service Console in real time."
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
        <div className="space-y-5 order-2 lg:order-1">
          <Card className="p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">1 · Patient</p>
            <Select value={patientId} onChange={(e) => start(entry, e.target.value)}>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} · MRN {p.mrn}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted mt-2">
              Verification details: <span className="font-mono text-ink">{patient.firstName} / {patient.lastName} / {fmtDate(patient.dob)}</span>
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">2 · How the patient arrives</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {ENTRIES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => start(e.id)}
                  className={cx(
                    'flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition-all',
                    entry === e.id ? 'bg-brand-50 ring-brand-300' : 'ring-line hover:ring-brand-200 hover:bg-canvas',
                  )}
                >
                  <span className={cx('grid place-items-center h-9 w-9 rounded-lg shrink-0', entry === e.id ? 'bg-brand-600 text-white' : 'bg-canvas text-muted')}>
                    <e.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{e.label}</span>
                    <span className="block text-xs text-muted mt-0.5">{e.spec}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">3 · Forms for {patient.firstName}</p>
            <div className="divide-y divide-line">
              {appts.flatMap((a) =>
                a.formIds.map((fid) => {
                  const f = formFor(fid)
                  const st = formStateFor(db, a.id, fid)
                  const why = availability(db, f, a)
                  return (
                    <div key={a.id + fid} className="flex items-center gap-3 py-2.5">
                      <span className={cx('h-2 w-2 rounded-full shrink-0', st.submission ? (st.submission.actionRequired ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-[#b4bec8]')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{f?.title}</p>
                        <p className="text-xs text-muted">
                          {a.clinic} · {fmtDate(a.start)} {fmtTime(a.start)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted whitespace-nowrap">{st.submission ? 'Submitted' : why === 'expired' ? 'Link expired' : why ? why : 'Open'}</span>
                      <a
                        href={withBase(`/f/?t=${a.token}&form=${fid}&via=sms`)}
                        target="_blank"
                        rel="noreferrer"
                        className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-brand-700 hover:bg-brand-50"
                        title="Open the browser link in a new tab"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    </div>
                  )
                }),
              )}
            </div>
          </Card>

          <div className="rounded-2xl bg-slate-900 text-white p-5 relative overflow-hidden">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Info className="h-4 w-4 text-brand-300" /> Prototype decisions on open spec questions
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-white/70 leading-relaxed">
              <li>• Links opened on a phone offer “Open in VisitPlus” or “Continue in browser” (§2.3.3). The browser path requires name + DOB verification unless the form allows anonymous submissions.</li>
              <li>• After 3 failed verification attempts the link shows <em>Access Denied</em> with the facility phone number (§3.4.1).</li>
              <li>• “Remind me later” snoozes the check-in CTA for {CTA_SNOOZE_HOURS} hours (§5.4.2.2).</li>
              <li>• Submitted forms show a greyed “Form submitted” button that opens a read-only view (§4.4.2, §6.4).</li>
            </ul>
          </div>
        </div>

        <div className="order-1 lg:order-2 flex flex-col items-center gap-4 lg:sticky lg:top-6">
          <Phone dark={dark}>
            {content}
            {cta && ctaAppt && (
              <CtaModal
                onClose={() => setCta(null)}
                onLater={() => {
                  actions.snoozeCta(ctaAppt.id, CTA_SNOOZE_HOURS)
                  setCta(null)
                  toast({ title: `Reminder snoozed for ${CTA_SNOOZE_HOURS} hours`, tone: 'info' })
                }}
                onFill={() => {
                  setCta(null)
                  if (ctaForm) openForm(ctaAppt, ctaForm.id, 'VisitPlus', true)
                }}
              />
            )}
          </Phone>
          <Button size="sm" variant="ghost" onClick={() => start(entry)}>
            Restart journey
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- App screens ------------------------------- */

function AppBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="relative bg-[#1f4e8c] text-white px-4 pt-3 pb-4 overflow-hidden">
      <svg className="absolute right-0 top-0 h-full w-40 opacity-20" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
        <path d="M30 0h70v60H0z" fill="white" />
      </svg>
      <div className="relative flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} aria-label="Back" className="-ml-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <p className="text-[17px] font-bold">{title}</p>
      </div>
    </div>
  )
}

function DateBlock({ iso, past }: { iso: string; past?: boolean }) {
  const d = new Date(iso)
  return (
    <div className="w-11 shrink-0 rounded-lg overflow-hidden text-center shadow-card ring-1 ring-black/5">
      <p className={cx('text-[9px] font-bold uppercase py-0.5 text-white', past ? 'bg-[#9aa5b1]' : 'bg-rose-500')}>{d.toLocaleString('en-AU', { month: 'short' })}</p>
      <p className="text-[17px] font-bold bg-white py-0.5">{d.getDate()}</p>
    </div>
  )
}

function FormButtons({ appt, onOpen, onView, variant = 'card' }: { appt: Appointment; onOpen: (a: Appointment, fid: string) => void; onView: (a: Appointment, fid: string) => void; variant?: 'card' | 'details' }) {
  const db = useDB()
  const past = new Date(appt.start).getTime() < Date.now()
  return (
    <>
      {appt.formIds.map((fid) => {
        const f = db.forms.find((x) => x.id === fid)
        if (!f || f.status !== 'published') return null
        const pre = f.settings.category === 'Pre-Appointment'
        // Pre-appointment forms show N days before; post-appointment forms only after the visit.
        const days = (new Date(appt.start).getTime() - Date.now()) / 86400e3
        if (pre && (past || days > f.settings.displayDaysBefore)) return null
        if (!pre && !past) return null
        const sub = formStateFor(db, appt.id, fid).submission
        if (sub)
          return (
            <button
              key={fid}
              onClick={() => onView(appt, fid)}
              className="w-full h-9 rounded-lg bg-[#eef1f4] text-[12.5px] font-semibold text-[#8a95a3] flex items-center justify-center gap-1.5"
              title="View submitted form"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Form submitted
            </button>
          )
        return (
          <button
            key={fid}
            onClick={() => onOpen(appt, fid)}
            className={cx(
              'w-full h-9 rounded-lg text-[12.5px] font-bold',
              pre || variant === 'details' ? 'bg-[#2d6d7a] text-white' : 'bg-[#eef1f4] text-ink',
            )}
          >
            {f.settings.buttonLabel}
          </button>
        )
      })}
    </>
  )
}

function AppHome({
  patient,
  appts,
  onOpen,
  onView,
  onDetails,
  onCheckIn,
}: {
  patient: Patient
  appts: Appointment[]
  onOpen: (a: Appointment, fid: string) => void
  onView: (a: Appointment, fid: string) => void
  onDetails: (a: Appointment) => void
  onCheckIn: (a: Appointment) => void
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin bg-[#f3f5f8]">
      <AppBar title="Appointments" />
      <p className="px-4 pt-3 text-[11px] font-semibold text-muted">Hi {patient.firstName} 👋</p>
      <div className="p-3 space-y-3 pb-10">
        {appts.map((a) => {
          const past = new Date(a.start).getTime() < Date.now() - 3600e3
          return (
            <div key={a.id} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-black/[.03]">
              <button onClick={() => onDetails(a)} className="flex w-full items-start gap-3 text-left">
                <DateBlock iso={a.start} past={past} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-brand-700 truncate flex-1">{a.facility}</p>
                    <span className={cx('text-[9.5px] font-bold rounded px-1.5 py-0.5 ring-1 ring-inset', past ? 'bg-[#eef1f4] text-muted ring-line' : 'bg-emerald-50 text-emerald-700 ring-emerald-200')}>
                      {past ? 'Completed' : 'Scheduled, Confirmed'}
                    </span>
                  </div>
                  <p className="text-[13.5px] font-bold mt-0.5 truncate">
                    {a.speciality} <span className="text-line">|</span> <span className="text-[#2563eb]">{a.provider}</span>
                  </p>
                </div>
              </button>
              <div className="mt-2.5 pt-2.5 border-t border-line space-y-1 text-[11.5px] text-ink/80">
                <p className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted" /> {new Date(a.start).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(a.start)}
                </p>
                <p className="flex items-center gap-2">
                  <User2 className="h-3 w-3 text-muted" /> {patient.firstName} {patient.lastName}
                </p>
                <p className="flex items-center gap-2">
                  <Stethoscope className="h-3 w-3 text-muted" /> {a.clinic}
                </p>
                <p className="flex items-center gap-2">
                  {a.location === 'Telephone' ? <PhoneIcon className="h-3 w-3 text-muted" /> : <MapPin className="h-3 w-3 text-muted" />} {a.location}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-md ring-1 ring-line px-1.5 py-0.5 text-[10px] font-semibold">
                    <Navigation className="h-2.5 w-2.5" /> {a.location === 'Telephone' ? 'Telephone info' : 'Directions'}
                  </span>
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {!past && a.formIds.length > 0 && (
                  <div className="rounded-lg bg-sky-50 ring-1 ring-sky-200 px-2.5 py-2 text-[10.5px] text-sky-800 leading-snug">
                    You may check in for this appointment when you have arrived at your appointment location.
                  </div>
                )}
                <FormButtons appt={a} onOpen={onOpen} onView={onView} />
                {!past && !a.checkedIn && (
                  <button onClick={() => onCheckIn(a)} className="w-full h-9 rounded-lg bg-[#2d6d7a] text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5">
                    Check in <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {a.checkedIn && <p className="text-center text-[11.5px] font-semibold text-emerald-700">✓ Checked in</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AppDetails({
  appt: a,
  patient,
  onBack,
  onOpen,
  onView,
  onCheckIn,
}: {
  appt: Appointment
  patient: Patient
  onBack: () => void
  onOpen: (a: Appointment, fid: string) => void
  onView: (a: Appointment, fid: string) => void
  onCheckIn: (a: Appointment) => void
}) {
  const past = new Date(a.start).getTime() < Date.now() - 3600e3
  const row = (k: string, v: ReactNode) => (
    <div className="py-2.5 border-b border-line last:border-0">
      <p className="text-[10.5px] text-muted">{k}</p>
      <p className="text-[13px] font-semibold">{v}</p>
    </div>
  )
  return (
    <div className="absolute inset-0 flex flex-col bg-[#f3f5f8]">
      <AppBar title="Details" onBack={onBack} />
      <div className="flex-1 overflow-y-auto scroll-thin p-3 pb-6 space-y-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-[10.5px] text-muted">Hospital</p>
          <p className="text-[15px] font-bold">{a.facility}</p>
          <p className="mt-2 text-[12px] flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted" /> {fmtTime(a.start)}, {new Date(a.start).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[12px] flex items-center gap-1.5 mt-1">
            <User2 className="h-3 w-3 text-muted" /> {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-1 shadow-card">
          {row('Speciality', a.speciality)}
          {row('Doctor', <span className="text-[#2563eb]">{a.provider}</span>)}
          {row('Clinic', a.clinic)}
          {row('Location', a.location)}
          <div className="py-3 space-y-2">
            <FormButtons appt={a} onOpen={onOpen} onView={onView} variant="details" />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-[13px] font-bold">Reschedule Instructions</p>
          <p className="text-[11.5px] text-muted mt-1">If you’re unable to attend, select ‘Cancel or Reschedule’ below to request your appointment to be rescheduled.</p>
        </div>
      </div>
      {!past && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-white border-t border-line">
          <button className="h-10 rounded-lg bg-[#eef1f4] text-[12.5px] font-semibold">Cancel or Reschedule</button>
          <button onClick={() => onCheckIn(a)} className="h-10 rounded-lg bg-slate-900 text-white text-[12.5px] font-semibold">
            Check in
          </button>
        </div>
      )}
    </div>
  )
}

function CtaModal({ onClose, onLater, onFill }: { onClose: () => void; onLater: () => void; onFill: () => void }) {
  return (
    <div className="absolute inset-0 z-20 bg-white flex flex-col animate-fade-in">
      <div className="flex justify-end p-4">
        <button onClick={onClose} aria-label="Close" className="grid place-items-center h-8 w-8 rounded-full bg-[#f1f4f6] text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center -mt-10">
        <h2 className="text-[19px] font-extrabold leading-tight">Complete Your Pre-Appointment Form</h2>
        <svg viewBox="0 0 120 120" className="h-32 w-32 my-6" aria-hidden>
          <circle cx="60" cy="62" r="50" fill="#e8f6f6" />
          <rect x="34" y="26" width="52" height="68" rx="8" fill="#bfe6e6" />
          <rect x="48" y="20" width="24" height="12" rx="4" fill="#2b8f91" />
          {[44, 60, 76].map((y) => (
            <g key={y}>
              <path d={`M42 ${y}l4 4 7-8`} stroke="#e6007e" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="58" y={y - 2} width="20" height="5" rx="2.5" fill="#3f6b7a" />
            </g>
          ))}
        </svg>
        <p className="text-[14px] text-muted leading-relaxed">To help us prepare for your upcoming appointment, please take a few minutes to complete your Form.</p>
        <div className="grid grid-cols-2 gap-2.5 w-full mt-8">
          <button onClick={onLater} className="h-11 rounded-lg ring-1 ring-[#3f6b7a] text-[#3f6b7a] text-[13px] font-bold">
            Remind me later
          </button>
          <button onClick={onFill} className="h-11 rounded-lg bg-[#e6007e] text-white text-[13px] font-bold">
            Fill out Form now
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckedIn({ appt, onDone }: { appt: Appointment; onDone: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-white">
      <span className="grid place-items-center h-20 w-20 rounded-full bg-emerald-500 text-white animate-pop">
        <CheckCircle2 className="h-10 w-10" />
      </span>
      <p className="mt-6 text-xl font-extrabold">You’re checked in</p>
      <p className="text-sm text-muted mt-1">
        {appt.clinic} · {fmtTime(appt.start)}
      </p>
      <p className="text-xs text-muted mt-4">Take a seat — we’ll call you shortly.</p>
      <button onClick={onDone} className="mt-10 w-full h-11 rounded-xl bg-slate-900 text-white font-semibold">
        Done
      </button>
    </div>
  )
}

/* ----------------------------- Entry-point screens ----------------------------- */

function LockScreen({ target, onTap }: { target: { appt: Appointment; form?: Form } | null; onTap: () => void }) {
  const now = new Date()
  const post = target?.form && target.form.settings.category !== 'Pre-Appointment'
  return (
    <div className="absolute inset-0 -top-10 pt-10 bg-[radial-gradient(120%_80%_at_20%_0%,#2b8f91_0%,#1b4d4f_45%,#0f1216_100%)] text-white">
      <div className="text-center mt-10">
        <p className="text-sm font-semibold text-white/75">{now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <p className="text-[76px] font-bold leading-none tracking-tight mt-1">{now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: false })}</p>
      </div>
      {target?.form ? (
        <button onClick={onTap} className="absolute left-3 right-3 top-[260px] rounded-[22px] bg-white/80 backdrop-blur-xl text-ink p-3.5 text-left shadow-pop animate-drop-in">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="grid place-items-center h-5 w-5 rounded-md bg-[#1f4e8c] text-white text-[9px] font-black">V+</span>
            <span className="font-semibold uppercase tracking-wide">VisitPlus</span>
            <span className="ml-auto">now</span>
          </div>
          <p className="mt-1.5 text-[13.5px] font-bold">{post ? `Please complete your ${target.form.title.toLowerCase()}` : 'Please complete your pre-appointment form'}</p>
          <p className="text-[12.5px] text-ink/75 leading-snug mt-0.5">Please complete your online form prior to your appointment. Tap this notification to open and submit the form.</p>
        </button>
      ) : (
        <p className="text-center text-sm text-white/60 mt-20">No pending forms for this patient.</p>
      )}
      <p className="absolute bottom-10 inset-x-0 text-center text-xs text-white/50">Tap the notification to open</p>
    </div>
  )
}

function SmsScreen({ patient, target, onLink }: { patient: Patient; target: { appt: Appointment; form?: Form } | null; onLink: () => void }) {
  const url = target ? `forms.nexa.com.au/f/?t=${target.appt.token}` : ''
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <div className="flex flex-col items-center py-2 border-b border-line bg-[#f7f7f8]">
        <span className="grid place-items-center h-11 w-11 rounded-full bg-gradient-to-b from-[#a5adb8] to-[#868e99] text-white text-sm font-bold">NX</span>
        <p className="text-[11px] mt-1 font-medium">NEXA Health &rsaquo;</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-center text-[10.5px] text-muted my-2">Text Message · Today {fmtTime(new Date(Date.now() - 600000).toISOString())}</p>
        {target?.form ? (
          <div className="max-w-[82%] rounded-[18px] rounded-bl-md bg-[#e9e9eb] px-3.5 py-2.5 text-[13.5px] leading-snug animate-rise-in">
            Hi {patient.firstName}, you have a form to fill out for your {target.appt.speciality} appointment on {fmtDate(target.appt.start)} at {fmtTime(target.appt.start)}. Go to:{' '}
            <button onClick={onLink} className="text-[#0a66d8] underline break-all text-left">
              {url}
            </button>
            <span className="block mt-1.5 text-[11.5px] text-muted">Reply STOP to opt out. {HEALTH_NETWORK.name}</span>
          </div>
        ) : (
          <p className="text-center text-sm text-muted mt-10">No pending forms.</p>
        )}
      </div>
      <div className="px-3 pb-6 pt-2 border-t border-line">
        <div className="h-9 rounded-full ring-1 ring-line px-4 flex items-center text-[13px] text-muted">Text Message</div>
      </div>
    </div>
  )
}

function EmailScreen({ patient, target, onLink }: { patient: Patient; target: { appt: Appointment; form?: Form } | null; onLink: () => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white">
      <div className="px-4 py-3 border-b border-line">
        <p className="text-[11px] text-muted">Inbox</p>
        <p className="text-[15px] font-bold mt-1 leading-snug">{target?.form ? `Action needed: ${target.form.title}` : 'No pending forms'}</p>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-brand-600 text-white text-[11px] font-bold">NX</span>
          <div className="text-[11.5px] leading-tight">
            <p className="font-semibold">{HEALTH_NETWORK.name}</p>
            <p className="text-muted">to {patient.email}</p>
          </div>
        </div>
      </div>
      {target?.form && (
        <div className="p-4 text-[13px] leading-relaxed">
          <div className="rounded-xl overflow-hidden ring-1 ring-line">
            <div className="h-1.5 bg-brand-500" />
            <div className="p-4">
              <p>Dear {patient.firstName},</p>
              <p className="mt-2">
                Please complete your <strong>{target.form.title}</strong> before your {target.appt.speciality} appointment with {target.appt.provider} on {fmtDate(target.appt.start)}.
              </p>
              <button onClick={onLink} className="mt-4 w-full h-10 rounded-lg bg-brand-600 text-white font-bold">
                Complete form
              </button>
              <p className="mt-3 text-[11px] text-muted break-all">Or copy this link: forms.nexa.com.au/f/?t={target.appt.token}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OpenWithSheet({ url, onApp, onBrowser, behind }: { url: string; onApp: () => void; onBrowser: () => void; behind: ReactNode }) {
  return (
    <div className="absolute inset-0">
      {behind}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div className="absolute inset-x-2 bottom-6 space-y-2 animate-rise-in">
        <div className="rounded-2xl bg-white/95 backdrop-blur overflow-hidden text-center">
          <p className="px-4 pt-3.5 pb-2 text-[12px] text-muted">
            Open <span className="font-mono text-[11px]">{url.slice(0, 28)}…</span> in VisitPlus?
          </p>
          <button onClick={onApp} className="w-full h-12 border-t border-line text-[15px] font-semibold text-[#0a66d8]">
            Open in VisitPlus
          </button>
          <button onClick={onBrowser} className="w-full h-12 border-t border-line text-[15px] text-[#0a66d8]">
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniBrowser({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-1 overflow-y-auto scroll-thin">{children}</div>
      <div className="shrink-0 bg-[#f7f7f8] border-t border-line px-3 pt-2 pb-6">
        <div className="h-9 rounded-xl bg-white ring-1 ring-line flex items-center justify-center gap-1.5 text-[12px] text-ink/80 truncate px-3">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url.split('/')[0]}
        </div>
      </div>
    </div>
  )
}
