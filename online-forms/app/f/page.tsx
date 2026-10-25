'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClientOnly } from '@/components/ClientOnly'
import { PatientJourney } from '@/components/PatientJourney'
import { useDB } from '@/lib/store'
import { NexaLogo } from '@/components/brand'

/**
 * The patient-facing form URL (#OnlineFormsURL). `?t=<token>&form=<id>` is an
 * appointment link from SMS/email; `?form=<id>` alone is the editor's Copy Link.
 */
function FormLink() {
  const params = useSearchParams()
  const db = useDB()
  const appt = db.appointments.find((a) => a.token === params.get('t'))
  const formId = params.get('form') ?? appt?.formIds[0]
  const form = db.forms.find((f) => f.id === formId)
  const patient = appt && db.patients.find((p) => p.id === appt.patientId)

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[720px] mx-auto px-4 py-6 sm:py-10">
        <PatientJourney
          form={form}
          appt={appt}
          patient={patient}
          channel={params.get('via') === 'email' ? 'Email' : params.get('via') === 'sms' ? 'SMS' : 'Browser'}
          authenticated={false}
          device="desktop"
          viaLink
          onClose={() => window.close()}
        />
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
          Powered by <NexaLogo className="h-3" />
        </p>
      </div>
    </div>
  )
}

export default function FormLinkPage() {
  return (
    <ClientOnly>
      <Suspense>
        <FormLink />
      </Suspense>
    </ClientOnly>
  )
}
