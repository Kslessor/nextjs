'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Archive, Ban, Copy, Download, Eye, History, Pencil, Rocket, Trash2, AlertCircle } from 'lucide-react'
import type { Form } from '@/lib/types'
import { actions, serviceNames, useDB, userFor } from '@/lib/store'
import { can } from '@/lib/permissions'
import { publishProblems, displayAnswer } from '@/lib/logic'
import { fmtDateTime, relTime, withBase } from '@/lib/util'
import { Button, ConfirmDialog, Drawer, Modal, useToast, type MenuItem } from './ui'
import { Avatar } from './Shell'

export function formLink(form: Pick<Form, 'id'>) {
  return `${window.location.origin}${withBase(`/f/?form=${form.id}`)}`
}

function exportCsv(form: Form, db: ReturnType<typeof useDB>) {
  const subs = db.submissions.filter((s) => s.formId === form.id)
  const fields = form.pages.flatMap((p) => p.fields).filter((f) => f.type !== 'dynamic')
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = [
    ['Submission ID', 'Submitted', 'Channel', 'Patient', 'MRN', 'Action required', ...fields.map((f) => f.label)],
    ...subs.map((s) => {
      const a = db.appointments.find((x) => x.id === s.appointmentId)
      const p = db.patients.find((x) => x.id === a?.patientId)
      return [
        s.id,
        fmtDateTime(s.submittedAt),
        s.channel,
        p ? `${p.firstName} ${p.lastName}` : 'Anonymous',
        p?.mrn ?? '',
        s.actionRequired ? 'Yes' : 'No',
        ...fields.map((f) => displayAnswer(f, s.answers[f.id])),
      ]
    }),
  ]
  const blob = new Blob([rows.map((r) => r.map((c) => esc(String(c))).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${form.title.replace(/[^\w]+/g, '-').toLowerCase()}-submissions.csv`
  a.click()
  URL.revokeObjectURL(url)
  return subs.length
}

/**
 * Status-aware actions shared by the Editor List cards and the builder's
 * Actions dropdown (spec §11.3 and §12.3.1), with their confirmation flows.
 */
export function useFormActions(opts: { onDeleted?: () => void; onDuplicated?: (f: Form) => void } = {}) {
  const db = useDB()
  const me = userFor(db.currentUser)
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState<{ kind: 'publish' | 'unpublish' | 'archive' | 'delete' | 'problems' | 'audit'; form: Form } | null>(null)

  const close = () => setPending(null)

  const duplicate = (f: Form) => {
    const copy = actions.duplicateForm(f.id)
    if (!copy) return
    toast({ title: 'Form duplicated', body: copy.title })
    opts.onDuplicated?.(copy)
  }

  const requestPublish = (f: Form) => {
    const probs = publishProblems(f)
    setPending({ kind: probs.length ? 'problems' : 'publish', form: f })
  }

  function items(f: Form, { includeOpen = true }: { includeOpen?: boolean } = {}): (MenuItem | 'divider')[] {
    const open = (tab: 'build' | 'preview') => router.push(`/builder/?id=${f.id}${tab === 'preview' ? '&tab=preview' : ''}`)
    const preview: MenuItem = { label: 'Preview', icon: <Eye />, onSelect: () => open('preview') }
    const dup: MenuItem = { label: 'Duplicate', icon: <Copy />, onSelect: () => duplicate(f), disabled: !can(me, 'create') }
    const audit: MenuItem = { label: 'Audit Trail', icon: <History />, onSelect: () => setPending({ kind: 'audit', form: f }) }
    const del: MenuItem = {
      label: 'Delete',
      icon: <Trash2 />,
      danger: true,
      disabled: !can(me, 'delete'),
      hint: can(me, 'delete') ? undefined : 'Only a Q-Flow Admin can delete forms',
      onSelect: () => setPending({ kind: 'delete', form: f }),
    }
    const exp: MenuItem = {
      label: 'Export submissions',
      icon: <Download />,
      disabled: !can(me, 'export'),
      onSelect: () => {
        const n = exportCsv(f, db)
        toast({ title: 'Export ready', body: `${n} submission${n === 1 ? '' : 's'} downloaded as CSV` })
      },
    }
    const pre = includeOpen ? [preview] : []
    switch (f.status) {
      case 'draft':
        return [
          ...pre,
          ...(includeOpen ? [{ label: 'Edit', icon: <Pencil />, onSelect: () => open('build') }] : []),
          dup,
          { label: 'Publish', icon: <Rocket />, onSelect: () => requestPublish(f), disabled: !can(me, 'publish') },
          audit,
          'divider',
          del,
        ]
      case 'published':
        return [...pre, dup, exp, audit, 'divider', { label: 'Unpublish', icon: <Ban />, onSelect: () => setPending({ kind: 'unpublish', form: f }), disabled: !can(me, 'publish') }]
      case 'unpublished':
        return [...pre, dup, exp, audit, 'divider', { label: 'Archive', icon: <Archive />, onSelect: () => setPending({ kind: 'archive', form: f }) }]
      case 'expired':
        return [...pre, dup, exp, audit, 'divider', del]
      case 'archived':
        return [...pre, dup, exp, audit]
    }
  }

  const f = pending?.form
  const subs = f ? db.submissions.filter((s) => s.formId === f.id).length : 0
  const dialogs: ReactNode = (
    <>
      <ConfirmDialog
        open={pending?.kind === 'publish'}
        title="Publish form?"
        description={
          <>
            <strong className="text-ink">{f?.title}</strong> will be linked to upcoming appointments in{' '}
            {serviceNames(f?.settings.services ?? []).join(', ') || 'its configured services'} and patients will start receiving it. Published forms can’t be edited — duplicate to make changes.
          </>
        }
        confirmLabel="Publish"
        onCancel={close}
        onConfirm={() => {
          actions.publishForm(f!.id)
          toast({ title: 'Form published', body: f!.title })
          close()
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'unpublish'}
        title="Unpublish form?"
        description="Patients will no longer be able to open or submit this form. Existing submissions stay available in Q-Flow."
        confirmLabel="Unpublish"
        tone="danger"
        onCancel={close}
        onConfirm={() => {
          actions.unpublishForm(f!.id)
          toast({ title: 'Form unpublished', body: f!.title })
          close()
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'archive'}
        title="Archive form?"
        description="Archived forms can’t be submitted and are hidden from the forms list. You can still find them with the Archived status filter."
        confirmLabel="Archive"
        onCancel={close}
        onConfirm={() => {
          actions.archiveForm(f!.id)
          toast({ title: 'Form archived', body: f!.title })
          close()
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title="Delete Form"
        description={
          <>
            This action cannot be undone. This will permanently delete the form and all its data.
            {subs > 0 && <span className="block mt-2 font-semibold text-rose-600">{subs} submission{subs === 1 ? '' : 's'} will also be removed from Q-Flow.</span>}
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={close}
        onConfirm={() => {
          actions.deleteForm(f!.id)
          toast({ title: 'Form deleted', body: f!.title })
          close()
          opts.onDeleted?.()
        }}
      />
      <Modal
        open={pending?.kind === 'problems'}
        onClose={close}
        size="sm"
        title="Almost ready to publish"
        description="Fix these before patients can receive the form:"
        icon={
          <span className="grid place-items-center h-10 w-10 shrink-0 rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </span>
        }
        footer={<Button variant="primary" onClick={close}>Got it</Button>}
      >
        <ul className="space-y-2">
          {f &&
            publishProblems(f).map((p) => (
              <li key={p} className="flex gap-2 text-sm text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                {p}
              </li>
            ))}
        </ul>
      </Modal>
      <AuditDrawer form={pending?.kind === 'audit' ? f : undefined} onClose={close} />
    </>
  )

  return { items, dialogs, requestPublish, duplicate, setPending }
}

export function AuditDrawer({ form, onClose }: { form?: Pick<Form, 'id' | 'title'>; onClose: () => void }) {
  const db = useDB()
  const entries = form ? db.audit.filter((a) => a.formId === form.id) : []
  return (
    <Drawer open={!!form} onClose={onClose} title={<span>Audit trail <span className="text-muted font-medium">· {form?.title}</span></span>}>
      <AuditList entries={entries} />
    </Drawer>
  )
}

export function AuditList({ entries, showForm }: { entries: ReturnType<typeof useDB>['audit']; showForm?: boolean }) {
  if (!entries.length) return <p className="p-6 text-sm text-muted">No activity recorded yet.</p>
  return (
    <ol className="relative px-6 py-5">
      <span className="absolute left-[41px] top-8 bottom-8 w-px bg-line" />
      {entries.map((e) => {
        const u = userFor(e.user)
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            <Avatar name={u.name} className="relative h-9 w-9 text-[11px] ring-4 ring-white shrink-0" />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm">
                <span className="font-semibold">{u.name}</span> <span className="text-muted">{e.action.charAt(0).toLowerCase() + e.action.slice(1)}</span>
                {showForm && <span className="font-semibold"> {e.formTitle}</span>}
              </p>
              <p className="text-xs text-muted mt-0.5" title={fmtDateTime(e.at)}>
                {relTime(e.at)} · {fmtDateTime(e.at)}
              </p>
              {e.changes && (
                <div className="mt-2.5 rounded-xl border border-line bg-canvas/60 divide-y divide-line text-[12.5px]">
                  {e.changes.map((c, i) => (
                    <div key={i} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
                      <span className="font-semibold text-ink">{c.field}</span>
                      <span className="min-w-0 break-words">
                        <span className="text-rose-600/80 line-through decoration-rose-300">{c.from}</span>
                        <span className="text-muted"> → </span>
                        <span className="text-emerald-700">{c.to}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
