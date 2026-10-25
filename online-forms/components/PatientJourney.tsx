'use client'

import { useState } from 'react'
import type { Appointment, Channel, Form, Patient } from '@/lib/types'
import { actions, formStateFor, useDB } from '@/lib/store'
import { FormRunner, SubmissionReceived, UnavailableCard, VerifyAccess, type Unavailable } from './FormRunner'

/** Why a patient can't open this form right now, if anything (spec §8). */
export function availability(db: ReturnType<typeof useDB>, form: Form | undefined, appt?: Appointment, viaLink = false): Unavailable | null {
  if (!form) return 'notfound'
  if (form.status === 'archived' || form.status === 'unpublished') return 'closed'
  if (form.status === 'expired') return 'expired'
  if (form.status !== 'published') return 'notfound'
  if (viaLink && !form.settings.deepLink) return 'denied'
  if (appt) {
    if (formStateFor(db, appt.id, form.id).submission) return 'submitted'
    const start = new Date(appt.start).getTime()
    const ms = form.settings.expiryValue * (form.settings.expiryUnit === 'days' ? 86400e3 : 3600e3)
    if (Date.now() > start + ms) return 'expired'
  }
  return null
}

/**
 * A patient's path through one form: (verify) → fill → received, or the
 * matching unavailable screen. Shared by VisitPlus and the browser link.
 */
export function PatientJourney({
  form,
  appt,
  patient,
  channel,
  authenticated,
  device = 'mobile',
  onClose,
  viaLink,
}: {
  form?: Form
  appt?: Appointment
  patient?: Patient
  channel: Channel
  authenticated: boolean
  device?: 'mobile' | 'desktop'
  onClose?: () => void
  viaLink?: boolean
}) {
  const db = useDB()
  const [step, setStep] = useState<'verify' | 'form' | 'done' | 'denied'>(() =>
    !authenticated && form && !form.settings.anonymous && patient ? 'verify' : 'form',
  )
  const [blocked] = useState(() => availability(db, form, appt, viaLink))

  if (blocked && step !== 'done')
    return (
      <div className="min-h-full grid place-items-center bg-slate-950/40 p-5">
        <UnavailableCard kind={blocked} onClose={onClose} />
      </div>
    )
  if (!form) return null
  if (step === 'denied')
    return (
      <div className="min-h-full grid place-items-center bg-slate-950/40 p-5">
        <UnavailableCard kind="denied" onClose={onClose} />
      </div>
    )
  if (step === 'verify' && patient) return <VerifyAccess form={form} patient={patient} onVerified={() => setStep('form')} onDenied={() => setStep('denied')} />
  if (step === 'done') return <SubmissionReceived message={form.settings.confirmationMessage} accent={form.settings.buttonColor} onClose={onClose} />
  return (
    <FormRunner
      form={form}
      device={device}
      ctx={{ patient, appointment: appt }}
      onClose={channel === 'VisitPlus' || channel === 'Push' ? onClose : undefined}
      onSubmit={(answers) => {
        actions.submit(form.id, appt?.id, answers, channel)
        setStep('done')
      }}
    />
  )
}
