'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { CheckCircle2, FileX2, Printer, X, AlertTriangle } from 'lucide-react'
import type { Appointment, Form, Patient, Submission } from '@/lib/types'
import { actions, userFor } from '@/lib/store'
import { cx, fmtDate, fmtDateTime } from '@/lib/util'
import { AnswerSheet } from './FormRunner'
import { FormStateIcon, NexaLogo } from './brand'
import { Button, useToast } from './ui'

/** Q-Flow: Submission Details pop-up with print (spec §23). */
export function SubmissionModal({
  open,
  onClose,
  form,
  submission,
  appointment,
  patient,
}: {
  open: boolean
  onClose: () => void
  form?: Form
  submission?: Submission
  appointment?: Appointment
  patient?: Patient
}) {
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.classList.add('printing-modal')
    return () => {
      window.removeEventListener('keydown', h)
      document.body.classList.remove('printing-modal')
    }
  }, [open, onClose])
  if (!open || !mounted) return null

  const ctx = { patient, appointment }
  const state = !submission ? 'pending' : submission.actionRequired ? 'action' : 'complete'

  return createPortal(
    <div className="submission-print fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0 print:block">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in print:hidden" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-pop animate-rise-in print:max-h-none print:shadow-none print:rounded-none">
        <header className="flex items-start gap-4 px-6 py-5 border-b border-line">
          <FormStateIcon state={state} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand-700">NEXA Online Form</p>
            <h2 className="text-lg font-bold leading-tight mt-0.5">{submission?.formTitle ?? form?.title ?? 'Online form'}</h2>
            {patient && (
              <p className="text-[13px] text-muted mt-1">
                {patient.firstName} {patient.lastName} · MRN {patient.mrn} · DOB {fmtDate(patient.dob)}
              </p>
            )}
          </div>
          <span className="hidden print:block">
            <NexaLogo className="h-6" />
          </span>
          {submission && (
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} className="print:hidden">
              Print Form
            </Button>
          )}
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-ink hover:bg-canvas print:hidden" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {!submission ? (
          <div className="px-6 py-16 text-center">
            <FileX2 className="mx-auto h-10 w-10 text-muted/50" />
            <p className="mt-3 text-base font-semibold">No data. Form has not been submitted.</p>
            <p className="text-sm text-muted mt-1">The patient will appear here once they complete the form.</p>
            <Button variant="primary" className="mt-6" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 print:overflow-visible">
            <div className="grid sm:grid-cols-4 gap-3 mb-5">
              {[
                ['Status', state === 'action' ? 'Action required' : 'Completed'],
                ['Submitted', fmtDateTime(submission.submittedAt)],
                ['Channel', submission.channel],
                ['Form version', `v${submission.formVersion}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-canvas px-3.5 py-2.5">
                  <p className="text-[11px] font-semibold text-muted">{k}</p>
                  <p className={cx('text-[13px] font-bold mt-0.5', k === 'Status' && state === 'action' && 'text-rose-600', k === 'Status' && state === 'complete' && 'text-emerald-700')}>{v}</p>
                </div>
              ))}
            </div>

            {submission.actionRequired ? (
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose-800">Follow-up needed</p>
                  <p className="text-[13px] text-rose-800/80 whitespace-pre-line mt-0.5">{submission.actionNote}</p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  className="print:hidden"
                  onClick={() => {
                    actions.resolveAction(submission.id)
                    toast({ title: 'Marked as actioned', body: 'The form icon is now green in Q-Flow.' })
                  }}
                >
                  Mark as actioned
                </Button>
              </div>
            ) : submission.actionResolvedAt ? (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-2.5 text-[13px] text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Actioned by {userFor(submission.actionResolvedBy ?? '').name} on {fmtDateTime(submission.actionResolvedAt)}
              </div>
            ) : null}

            {appointment && (
              <div className="mb-5 grid sm:grid-cols-3 gap-x-6 gap-y-1 text-[13px] rounded-xl border border-line px-4 py-3">
                <p>
                  <span className="text-muted">Clinic </span>
                  <span className="font-semibold">{appointment.clinic}</span>
                </p>
                <p>
                  <span className="text-muted">Provider </span>
                  <span className="font-semibold">{appointment.provider}</span>
                </p>
                <p>
                  <span className="text-muted">Appointment </span>
                  <span className="font-semibold">{fmtDateTime(appointment.start)}</span>
                </p>
              </div>
            )}

            <AnswerSheet form={{ pages: submission.pages }} answers={submission.answers} ctx={ctx} />
            <p className="hidden print:block mt-8 text-[11px] text-muted">
              Printed {fmtDateTime(new Date().toISOString())} from Q-Flow Service Console · Submission {submission.id}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
