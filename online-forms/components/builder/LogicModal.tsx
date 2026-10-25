'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, GitBranch, Plus, X, Eye } from 'lucide-react'
import type { DisplayCondition, Field, Form, JumpRule, Operator } from '@/lib/types'
import { canJump, isChoice, optionsFor } from '@/lib/fields'
import { uid } from '@/lib/util'
import { Button, ConfirmDialog, IconButton, Input, Modal, Select } from '../ui'

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
]

/** Editor: Conditional Logic (spec §15) — page jumps + display/hide for one field. */
export function LogicModal({
  form,
  field,
  onClose,
  onSave,
}: {
  form: Form
  field: Field | null
  onClose: () => void
  onSave: (patch: Pick<Field, 'condition' | 'jumps'>) => void
}) {
  const [jumps, setJumps] = useState<JumpRule[]>([])
  const [cond, setCond] = useState<DisplayCondition | undefined>()
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    setJumps(field?.jumps ?? [])
    setCond(field?.condition)
  }, [field])

  if (!field) return null

  // Sources: any other answerable field that comes before this one.
  const ordered = form.pages.flatMap((p) => p.fields)
  const sources = ordered.slice(0, ordered.findIndex((f) => f.id === field.id)).filter((f) => f.type !== 'dynamic' && f.type !== 'file')
  const source = sources.find((s) => s.id === cond?.sourceId)
  const opts = optionsFor(field)
  const hasLogic = !!field.condition || !!field.jumps?.length
  const valid = jumps.every((j) => j.option && j.targetPageId) && (!cond || (cond.sourceId && cond.value.trim()))

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title="Conditional Logic"
        description={
          <>
            For <strong className="text-ink">{field.label || 'Untitled question'}</strong>. Only one question per page can use conditional logic so rules never compete.
          </>
        }
        footer={
          <>
            {hasLogic && (
              <Button variant="ghost" className="mr-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setConfirmRemove(true)}>
                Remove logic
              </Button>
            )}
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() => onSave({ condition: cond && cond.sourceId ? cond : undefined, jumps: jumps.length ? jumps : undefined })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {canJump(field.type) && (
            <section className="rounded-2xl border border-line p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <GitBranch className="h-4 w-4 text-brand-600" /> Page Jump Logic
              </h3>
              <p className="text-[13px] text-muted mt-0.5">Skip to a specific page based on this answer. The first matching rule wins; otherwise the form continues in order.</p>
              <div className="mt-4 space-y-2.5">
                {jumps.map((j, i) => (
                  <div key={j.id} className="flex items-center gap-2 rounded-xl bg-canvas p-2.5 animate-rise-in">
                    <span className="text-xs font-semibold text-muted pl-1 whitespace-nowrap">If answer is</span>
                    <div className="flex-1 min-w-0">
                      <Select value={j.option} onChange={(e) => setJumps(jumps.map((x, k) => (k === i ? { ...x, option: e.target.value } : x)))} aria-label="Answer">
                        <option value="">Select answer</option>
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted whitespace-nowrap">
                      <ArrowRight className="h-3.5 w-3.5" /> go to
                    </span>
                    <div className="flex-1 min-w-0">
                      <Select value={j.targetPageId} onChange={(e) => setJumps(jumps.map((x, k) => (k === i ? { ...x, targetPageId: e.target.value } : x)))} aria-label="Target page">
                        <option value="">Select page</option>
                        {form.pages.map((p, k) => (
                          <option key={p.id} value={p.id} disabled={p.fields.some((f) => f.id === field.id)}>
                            {p.title || `Page ${k + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <IconButton label="Remove rule" onClick={() => setJumps(jumps.filter((_, k) => k !== i))}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-3"
                icon={<Plus className="h-3.5 w-3.5" />}
                disabled={form.pages.length < 2}
                title={form.pages.length < 2 ? 'Add another page to create a jump' : undefined}
                onClick={() => setJumps([...jumps, { id: uid('jmp'), option: '', targetPageId: '' }])}
              >
                Add Jump Rule
              </Button>
              {form.pages.length < 2 && <p className="text-xs text-muted mt-2">Add another page to the form to create a jump.</p>}
            </section>
          )}

          <section className="rounded-2xl border border-line p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Eye className="h-4 w-4 text-brand-600" /> Display Logic
            </h3>
            <p className="text-[13px] text-muted mt-0.5">Show this field only when a condition is met.</p>
            <div className="mt-4 grid sm:grid-cols-[1.4fr_1fr_1.2fr] gap-2.5">
              <Select
                value={cond?.sourceId ?? ''}
                onChange={(e) => setCond(e.target.value ? { sourceId: e.target.value, operator: cond?.operator ?? 'equals', value: '' } : undefined)}
                aria-label="Source field"
              >
                <option value="">Always show</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Select value={cond?.operator ?? 'equals'} disabled={!cond} onChange={(e) => cond && setCond({ ...cond, operator: e.target.value as Operator })} aria-label="Operator">
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {source && isChoice(source.type) ? (
                <Select value={cond?.value ?? ''} onChange={(e) => cond && setCond({ ...cond, value: e.target.value })} aria-label="Value">
                  <option value="">Select value</option>
                  {optionsFor(source).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={cond?.value ?? ''}
                  disabled={!cond}
                  placeholder="Value"
                  type={source?.type === 'number' ? 'number' : source?.type === 'date' ? 'date' : 'text'}
                  onChange={(e) => cond && setCond({ ...cond, value: e.target.value })}
                  aria-label="Value"
                />
              )}
            </div>
            {sources.length === 0 && <p className="text-xs text-muted mt-2">Display logic can only depend on questions that appear before this one.</p>}
          </section>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmRemove}
        title="Confirm"
        description="Are you sure you wish to delete the conditional logic from this field?"
        confirmLabel="Confirm"
        tone="danger"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false)
          onSave({ condition: undefined, jumps: undefined })
        }}
      />
    </>
  )
}
