'use client'

import { useState } from 'react'
import { Copy, Flag, GitBranch, GripVertical, Layers, Plus, Trash2, X, Eye } from 'lucide-react'
import type { DynamicKey, Field, Page } from '@/lib/types'
import { DYNAMIC_FIELDS, fieldLabel, optionsFor } from '@/lib/fields'
import { cx } from '@/lib/util'
import { Button, IconButton, Input, Label, Select, Toggle } from '../ui'
import { FieldIcon } from './FieldIcon'

export function PageCard({
  page,
  index,
  canDelete,
  readOnly,
  onChange,
  onDelete,
}: {
  page: Page
  index: number
  canDelete: boolean
  readOnly: boolean
  onChange: (p: Page) => void
  onDelete: () => void
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-line shadow-card px-6 py-5">
      <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-brand-500" />
      <input
        value={page.title}
        disabled={readOnly}
        onChange={(e) => onChange({ ...page, title: e.target.value })}
        placeholder={`Page ${index + 1}`}
        aria-label="Page title"
        className="w-full bg-transparent text-[17px] font-bold text-ink placeholder:text-ink/40 focus:outline-none disabled:bg-transparent"
      />
      <input
        value={page.description}
        disabled={readOnly}
        onChange={(e) => onChange({ ...page, description: e.target.value })}
        placeholder="Page description (optional)"
        aria-label="Page description"
        className="w-full bg-transparent text-sm text-muted placeholder:text-muted/70 focus:outline-none mt-0.5 disabled:bg-transparent"
      />
      {!readOnly && (
        <IconButton
          label={canDelete ? 'Delete page' : 'A form needs at least one page'}
          disabled={!canDelete}
          onClick={onDelete}
          className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  )
}

export function EmptyPage() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#d6dee5] bg-white/60 py-16 text-center">
      <span className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-brand-50 text-brand-600">
        <Layers className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold text-ink">No fields yet</p>
      <p className="text-sm text-muted mt-0.5">Click a field type on the left to add it</p>
    </div>
  )
}

export function FieldCard({
  field: f,
  selected,
  readOnly,
  logicLocked,
  dragging,
  dropBefore,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onLogic,
  dragProps,
  sourceLabel,
  pageName,
}: {
  field: Field
  selected: boolean
  readOnly: boolean
  logicLocked: boolean
  dragging: boolean
  dropBefore: boolean
  onSelect: () => void
  onChange: (f: Field) => void
  onDuplicate: () => void
  onDelete: () => void
  onLogic: () => void
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean }
  sourceLabel?: string
  pageName: (id: string) => string
}) {
  const hasLogic = !!f.condition || !!f.jumps?.length
  return (
    <div
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={cx(
        'group relative bg-white rounded-2xl border transition-all duration-150',
        selected ? 'border-brand-400 shadow-lift ring-4 ring-brand-500/10' : 'border-line shadow-card hover:border-[#cbd5dd]',
        dragging && 'opacity-40',
        dropBefore && 'drag-over',
        !selected && 'cursor-pointer',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3.5">
        <span
          className={cx('grid place-items-center h-7 w-5 text-[#b4bec8]', !readOnly && 'cursor-grab active:cursor-grabbing hover:text-muted')}
          aria-hidden
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className={cx('grid place-items-center h-9 w-9 rounded-xl shrink-0', f.type === 'dynamic' ? 'bg-violet-50 text-violet-600' : 'bg-brand-50 text-brand-700')}>
          <FieldIcon type={f.type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">
            {f.label || <span className="text-muted italic font-normal">Untitled question</span>}
            {f.required && f.type !== 'dynamic' && <span className="text-rose-500"> *</span>}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted">{f.type === 'dynamic' ? `Patient record · read only` : fieldLabel(f.type)}</span>
            {f.condition && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 px-2 h-5 text-[10.5px] font-bold">
                <Eye className="h-3 w-3" /> Shown if {sourceLabel ? `“${sourceLabel.slice(0, 22)}${sourceLabel.length > 22 ? '…' : ''}”` : 'condition'} {f.condition.operator.replace('_', ' ')} {f.condition.value}
              </span>
            )}
            {!!f.jumps?.length && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2 h-5 text-[10.5px] font-bold" title={f.jumps.map((j) => `${j.option} → ${pageName(j.targetPageId)}`).join('\n')}>
                <GitBranch className="h-3 w-3" /> {f.jumps.length} jump{f.jumps.length === 1 ? '' : 's'}
              </span>
            )}
            {!!f.flagOptions?.length && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2 h-5 text-[10.5px] font-bold">
                <Flag className="h-3 w-3" /> Flags {f.flagOptions.join(', ')}
              </span>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className={cx('flex items-center gap-0.5 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
            {f.type !== 'dynamic' && (
              <IconButton
                label={logicLocked ? 'Only one question per page can use conditional logic' : hasLogic ? 'Edit conditional logic' : 'Add conditional logic'}
                disabled={logicLocked}
                onClick={(e) => {
                  e.stopPropagation()
                  onLogic()
                }}
                className={cx(hasLogic && 'text-violet-600 bg-violet-50 hover:bg-violet-100 hover:text-violet-700')}
              >
                <GitBranch className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton
              label="Duplicate field"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
            >
              <Copy className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Delete field"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        )}
      </div>
      {selected && !readOnly && (
        <div className="border-t border-line px-5 py-5 cursor-default animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <FieldEditor field={f} onChange={onChange} onLogic={onLogic} logicLocked={logicLocked} />
        </div>
      )}
    </div>
  )
}

function FieldEditor({ field: f, onChange, onLogic, logicLocked }: { field: Field; onChange: (f: Field) => void; onLogic: () => void; logicLocked: boolean }) {
  const set = <K extends keyof Field>(k: K, v: Field[K]) => onChange({ ...f, [k]: v })
  const [newOpt, setNewOpt] = useState('')
  const textish = ['short_text', 'long_text', 'number', 'email', 'phone'].includes(f.type)
  const opts = f.options ?? []

  if (f.type === 'dynamic')
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label hint="Pulled from the Outcome Form and shown read-only.">Record field</Label>
          <Select
            value={f.dynamicKey}
            onChange={(e) => {
              const d = DYNAMIC_FIELDS.find((x) => x.key === e.target.value)!
              onChange({ ...f, dynamicKey: d.key as DynamicKey, label: d.label })
            }}
          >
            {DYNAMIC_FIELDS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Display label</Label>
          <Input value={f.label} onChange={(e) => set('label', e.target.value)} />
        </div>
      </div>
    )

  const toggleFlag = (o: string) => {
    const cur = f.flagOptions ?? []
    const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]
    set('flagOptions', next.length ? next : undefined)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label required htmlFor={`lbl-${f.id}`}>
          Question
        </Label>
        <Input id={`lbl-${f.id}`} autoFocus value={f.label} onChange={(e) => set('label', e.target.value)} invalid={!f.label.trim()} placeholder="What would you like to ask?" />
      </div>
      <div className={cx('grid gap-4', textish && 'sm:grid-cols-2')}>
        {textish && (
          <div>
            <Label>Placeholder</Label>
            <Input value={f.placeholder ?? ''} onChange={(e) => set('placeholder', e.target.value)} placeholder="Hint inside the box" />
          </div>
        )}
        <div>
          <Label>Helper text</Label>
          <Input value={f.helpText ?? ''} onChange={(e) => set('helpText', e.target.value || undefined)} placeholder="Optional guidance under the question" />
        </div>
      </div>

      {(f.type === 'dropdown' || f.type === 'radio' || f.type === 'checkboxes') && (
        <div>
          <Label hint="Flag an answer to turn the Q-Flow form icon red so staff follow up.">Options</Label>
          <div className="space-y-1.5">
            {opts.map((o, i) => {
              const flagged = f.flagOptions?.includes(o)
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={cx('h-4 w-4 shrink-0 border-[1.5px] border-[#b6c1cb]', f.type === 'checkboxes' ? 'rounded' : 'rounded-full')} />
                  <Input
                    value={o}
                    onChange={(e) => {
                      const next = [...opts]
                      next[i] = e.target.value
                      onChange({
                        ...f,
                        options: next,
                        flagOptions: f.flagOptions?.map((x) => (x === o ? e.target.value : x)),
                        jumps: f.jumps?.map((j) => (j.option === o ? { ...j, option: e.target.value } : j)),
                      })
                    }}
                    className="h-9"
                    aria-label={`Option ${i + 1}`}
                  />
                  <IconButton label={flagged ? 'Unflag answer' : 'Flag answer for follow-up'} onClick={() => toggleFlag(o)} className={cx(flagged && 'text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700')}>
                    <Flag className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Remove option"
                    disabled={opts.length <= 1}
                    onClick={() =>
                      onChange({
                        ...f,
                        options: opts.filter((_, k) => k !== i),
                        flagOptions: f.flagOptions?.filter((x) => x !== o),
                        jumps: f.jumps?.filter((j) => j.option !== o),
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              )
            })}
          </div>
          <form
            className="flex items-center gap-2 mt-2"
            onSubmit={(e) => {
              e.preventDefault()
              const v = newOpt.trim() || `Option ${opts.length + 1}`
              if (opts.includes(v)) return
              set('options', [...opts, v])
              setNewOpt('')
            }}
          >
            <span className="w-4" />
            <Input value={newOpt} onChange={(e) => setNewOpt(e.target.value)} placeholder="Add an option and press Enter" className="h-9" />
            <Button type="submit" size="sm" variant="subtle" icon={<Plus className="h-3.5 w-3.5" />}>
              Add
            </Button>
          </form>
        </div>
      )}

      {f.type === 'smiley' && (
        <div>
          <Label hint="Flag answers to turn the Q-Flow form icon red so staff follow up.">Flag for follow-up</Label>
          <div className="flex flex-wrap gap-1.5">
            {optionsFor(f).map((o) => {
              const on = f.flagOptions?.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleFlag(o)}
                  className={cx('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold ring-1 ring-inset', on ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white text-muted ring-line hover:text-ink')}
                >
                  <Flag className="h-3 w-3" /> {o}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {(f.type === 'short_text' || f.type === 'long_text') && (
        <div className="w-40">
          <Label>Max length</Label>
          <Input type="number" min={1} value={f.maxLength ?? ''} placeholder="No limit" onChange={(e) => set('maxLength', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      )}
      {f.type === 'number' && (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <Label>Minimum</Label>
            <Input type="number" value={f.min ?? ''} placeholder="None" onChange={(e) => set('min', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <Label>Maximum</Label>
            <Input type="number" value={f.max ?? ''} placeholder="None" onChange={(e) => set('max', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
        </div>
      )}
      {f.type === 'date' && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <Label>Earliest date</Label>
            <Input type="date" value={f.minDate ?? ''} onChange={(e) => set('minDate', e.target.value || undefined)} />
          </div>
          <div>
            <Label>Latest date</Label>
            <Input type="date" value={f.maxDate ?? ''} onChange={(e) => set('maxDate', e.target.value || undefined)} />
          </div>
        </div>
      )}
      {f.type === 'file' && (
        <div className="grid grid-cols-[1fr_120px] gap-4 max-w-md">
          <div>
            <Label>Allowed file types</Label>
            <Input value={f.fileTypes ?? ''} placeholder=".pdf,.jpg,.png" onChange={(e) => set('fileTypes', e.target.value)} className="font-mono text-[13px]" />
          </div>
          <div>
            <Label>Max size (MB)</Label>
            <Input type="number" min={1} value={f.maxFileMb ?? ''} onChange={(e) => set('maxFileMb', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-line">
        <label className="flex items-center gap-2.5 text-[13px] font-semibold">
          <Toggle checked={f.required} onChange={(v) => set('required', v)} label="Required" />
          Required
        </label>
        <span className="flex-1" />
        <Button
          size="sm"
          variant={f.condition || f.jumps?.length ? 'subtle' : 'secondary'}
          icon={<GitBranch className="h-3.5 w-3.5" />}
          disabled={logicLocked}
          title={logicLocked ? 'Only one question per page can use conditional logic' : undefined}
          onClick={onLogic}
        >
          {f.condition || f.jumps?.length ? 'Edit logic' : 'Conditional logic'}
        </Button>
      </div>
      {logicLocked && <p className="text-xs text-muted -mt-2 text-right">Another question on this page already uses conditional logic.</p>}
    </div>
  )
}
