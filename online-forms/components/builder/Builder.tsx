'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Eye, Hammer, Layers, Lock, Monitor, Plus, RotateCcw, Save, Settings2, Smartphone, GripVertical, ClipboardCheck, Info, Check } from 'lucide-react'
import type { DynamicKey, Field, FieldType, Form, Page } from '@/lib/types'
import { actions, serviceNames, useDB, userFor } from '@/lib/store'
import { DYNAMIC_FIELDS, FIELD_CATALOG, newField } from '@/lib/fields'
import { defaultSettings, HEALTH_NETWORK } from '@/lib/seed'
import { editBlocker, ROLE_LABEL } from '@/lib/permissions'
import type { Answers } from '@/lib/logic'
import { clone, cx, fmtDate, fmtDateTime, relTime, uid } from '@/lib/util'
import { Button, ConfirmDialog, Menu, Segmented, StatusPill, Tag, useToast } from '../ui'
import { useFormActions } from '../FormActions'
import { AnswerSheet, FormRunner, SubmissionReceived } from '../FormRunner'
import { Phone } from '../Phone'
import { FieldIcon } from './FieldIcon'
import { LogicModal } from './LogicModal'
import { SettingsPanel } from './SettingsPanel'
import { EmptyPage, FieldCard, PageCard } from './Workspace'

function blankForm(user: string): Form {
  const now = new Date().toISOString()
  return {
    id: uid('frm'),
    title: '',
    description: '',
    status: 'draft',
    version: 1,
    pages: [{ id: uid('pg'), title: 'Page 1', description: '', fields: [] }],
    settings: defaultSettings(),
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  }
}

const SAMPLE = { firstName: 'Harry', lastName: 'Manson', dob: '1988-02-04', id: 'pt_harry', mrn: '20220187', phone: '', email: '' }

export function Builder() {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const db = useDB()
  const me = userFor(db.currentUser)
  const idParam = params.get('id') ?? 'new'
  const stored = db.forms.find((f) => f.id === idParam)

  const initial = useMemo(() => (stored ? clone(stored) : blankForm(me.email)), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Form>(initial)
  const synced = useRef<string>(stored ? JSON.stringify(stored) : '')
  const isNew = !db.forms.some((f) => f.id === draft.id)
  const dirty = isNew ? JSON.stringify(draft) !== JSON.stringify({ ...initial, id: draft.id }) : JSON.stringify(draft) !== synced.current

  // Mirror store changes (publish, unpublish…) into the editor when there are no local edits.
  const live = db.forms.find((f) => f.id === draft.id)
  useEffect(() => {
    if (!live) return
    const s = JSON.stringify(live)
    if (s === synced.current) return
    if (JSON.stringify(draft) === synced.current) setDraft(clone(live))
    synced.current = s
  }, [live]) // eslint-disable-line react-hooks/exhaustive-deps

  const blocker = editBlocker(me, draft)
  const readOnly = draft.status !== 'draft' || !!blocker
  const [tab, setTab] = useState<'build' | 'preview'>(params.get('tab') === 'preview' || draft.status !== 'draft' ? 'preview' : 'build')
  const [panel, setPanel] = useState<'fields' | 'settings'>('fields')
  const [pageId, setPageId] = useState(draft.pages[0].id)
  const [selected, setSelected] = useState<string | null>(null)
  const [logicFor, setLogicFor] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [confirmPageDelete, setConfirmPageDelete] = useState<Page | null>(null)
  const [drag, setDrag] = useState<{ kind: 'field' | 'page'; id: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const fa = useFormActions({
    onDeleted: () => router.push('/forms/'),
    onDuplicated: (copy) => router.push(`/builder/?id=${copy.id}`),
  })

  // Navigating to another form (e.g. after Duplicate) swaps the working copy.
  useEffect(() => {
    if (!stored || stored.id === draft.id) return
    synced.current = JSON.stringify(stored)
    setDraft(clone(stored))
    setPageId(stored.pages[0].id)
    setSelected(null)
    setTab(stored.status === 'draft' ? 'build' : 'preview')
  }, [stored?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pageIndex = Math.max(0, draft.pages.findIndex((p) => p.id === pageId))
  const page = draft.pages[pageIndex]
  const allFields = draft.pages.flatMap((p) => p.fields)

  useEffect(() => {
    if (!draft.pages.some((p) => p.id === pageId)) setPageId(draft.pages[0].id)
  }, [draft.pages, pageId])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  /* ------------------------------ mutations ------------------------------ */

  const updatePage = (p: Page) => setDraft((d) => ({ ...d, pages: d.pages.map((x) => (x.id === p.id ? p : x)) }))
  const updateField = (f: Field) => setDraft((d) => ({ ...d, pages: d.pages.map((p) => ({ ...p, fields: p.fields.map((x) => (x.id === f.id ? f : x)) })) }))

  const addField = (type: FieldType, key?: DynamicKey) => {
    if (readOnly) return
    const f = newField(type, key)
    setDraft((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page.id ? { ...p, fields: [...p.fields, f] } : p)) }))
    setSelected(f.id)
    setTimeout(() => document.getElementById(`card-${f.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
  }

  const removeField = (id: string) =>
    setDraft((d) => ({
      ...d,
      pages: d.pages.map((p) => ({
        ...p,
        fields: p.fields.filter((x) => x.id !== id).map((x) => (x.condition?.sourceId === id ? { ...x, condition: undefined } : x)),
      })),
    }))

  const duplicateField = (f: Field) => {
    const copy: Field = { ...clone(f), id: uid('fld'), label: `${f.label} (copy)`, condition: undefined, jumps: undefined }
    setDraft((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        const i = p.fields.findIndex((x) => x.id === f.id)
        if (i < 0) return p
        const fields = [...p.fields]
        fields.splice(i + 1, 0, copy)
        return { ...p, fields }
      }),
    }))
    setSelected(copy.id)
  }

  const addPage = () => {
    const p: Page = { id: uid('pg'), title: `Page ${draft.pages.length + 1}`, description: '', fields: [] }
    setDraft((d) => ({ ...d, pages: [...d.pages, p] }))
    setPageId(p.id)
    setSelected(null)
  }

  const deletePage = (pg: Page) => {
    const gone = new Set(pg.fields.map((f) => f.id))
    setDraft((d) => ({
      ...d,
      pages: d.pages
        .filter((p) => p.id !== pg.id)
        .map((p) => ({
          ...p,
          fields: p.fields.map((f) => {
            // Spec §15.4.1: jump rules pointing at a deleted page are removed.
            const jumps = f.jumps?.filter((j) => j.targetPageId !== pg.id)
            return { ...f, jumps: jumps?.length ? jumps : undefined, condition: f.condition && gone.has(f.condition.sourceId) ? undefined : f.condition }
          }),
        })),
    }))
    setConfirmPageDelete(null)
  }

  const moveField = (id: string, beforeId: string | null) => {
    if (id === beforeId) return
    setDraft((d) => ({
      ...d,
      pages: d.pages.map((p) => {
        if (p.id !== page.id) return p
        const f = p.fields.find((x) => x.id === id)!
        const rest = p.fields.filter((x) => x.id !== id)
        const i = beforeId ? rest.findIndex((x) => x.id === beforeId) : rest.length
        rest.splice(i < 0 ? rest.length : i, 0, f)
        return { ...p, fields: rest }
      }),
    }))
  }

  const movePage = (id: string, beforeId: string | null) => {
    if (id === beforeId) return
    setDraft((d) => {
      const pg = d.pages.find((x) => x.id === id)!
      const rest = d.pages.filter((x) => x.id !== id)
      const i = beforeId ? rest.findIndex((x) => x.id === beforeId) : rest.length
      rest.splice(i < 0 ? rest.length : i, 0, pg)
      return { ...d, pages: rest }
    })
  }

  const save = useCallback(() => {
    if (!draft.title.trim() || readOnly) return
    const saved = actions.saveForm(draft)
    synced.current = JSON.stringify(saved)
    setDraft(saved)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
    if (params.get('id') !== saved.id) router.replace(`/builder/?id=${saved.id}${tab === 'preview' ? '&tab=preview' : ''}`)
    toast({ title: 'Form saved', body: `${saved.title} · ${fmtDateTime(saved.updatedAt)}` })
  }, [draft, readOnly, params, router, tab, toast])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [save])

  const publish = () => {
    const saved = dirty || isNew ? actions.saveForm(draft) : draft
    synced.current = JSON.stringify(saved)
    setDraft(saved)
    if (params.get('id') !== saved.id) router.replace(`/builder/?id=${saved.id}`)
    fa.requestPublish(saved)
  }

  const back = () => (dirty ? setLeaving(true) : router.push('/forms/'))

  /* ------------------------------- rendering ------------------------------- */

  const canSave = !readOnly && !!draft.title.trim() && (dirty || isNew)
  const menuItems = isNew
    ? []
    : fa.items(draft, { includeOpen: false }).map((it) => (it !== 'divider' && it.label === 'Publish' ? { ...it, onSelect: publish } : it))
  const logicField = allFields.find((f) => f.id === logicFor) ?? null
  const pageHasLogic = (pg: Page, except: string) => pg.fields.some((f) => f.id !== except && (f.condition || f.jumps?.length))
  const pageName = (id: string) => {
    const i = draft.pages.findIndex((p) => p.id === id)
    return i < 0 ? 'deleted page' : draft.pages[i].title || `Page ${i + 1}`
  }

  return (
    <div className="h-screen flex flex-col bg-canvas">
      {/* ---------------- Top navigation (spec §12) ---------------- */}
      <header className="shrink-0 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
          <button onClick={back} className="grid place-items-center h-9 w-9 rounded-lg text-muted hover:text-ink hover:bg-canvas" aria-label="Back to forms">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className={cx('text-[15.5px] font-bold truncate', !draft.title && 'text-muted')}>{draft.title || 'Untitled Form'}</h1>
              <StatusPill status={draft.status} className="hidden sm:inline-flex" />
              <Tag className="hidden md:inline-flex font-mono text-[11px]">v{draft.version}</Tag>
            </div>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
              {dirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                </>
              ) : isNew ? (
                'Not saved yet'
              ) : justSaved ? (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              ) : (
                <>Last saved {relTime(draft.updatedAt)}</>
              )}
            </p>
          </div>

          <div className="flex-1 flex justify-center">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'build', label: 'Build', icon: <Hammer className="h-3.5 w-3.5" />, disabled: draft.status !== 'draft' },
                { value: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>

          <div className="flex items-center">
            <Button
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              disabled={!canSave}
              onClick={save}
              title={!draft.title.trim() ? 'Add a form title in Settings to save' : undefined}
              className={cx(menuItems.length > 0 && 'rounded-r-none')}
            >
              Save
            </Button>
            {menuItems.length > 0 && (
              <Menu
                items={menuItems}
                trigger={({ toggle }) => (
                  <Button variant="primary" onClick={toggle} className="rounded-l-none border-l border-white/20 px-2.5" aria-label="Form actions">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                )}
              />
            )}
          </div>
        </div>
      </header>

      {(blocker || draft.status !== 'draft') && (
        <div className="shrink-0 flex items-center gap-2.5 px-6 py-2.5 bg-amber-50 border-b border-amber-200/70 text-[13px] text-amber-900">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            {blocker ?? (
              <>
                This form is <strong className="font-semibold">{draft.status}</strong> and can’t be edited. Duplicate it from the actions menu to make changes.
              </>
            )}
          </span>
        </div>
      )}

      {tab === 'build' ? (
        <div className="flex-1 min-h-0 flex">
          {/* ---------------- Left panel (Fields / Settings) ---------------- */}
          <aside className="w-[332px] shrink-0 bg-white border-r border-line flex flex-col">
            <div className="p-4 pb-3 border-b border-line">
              <Segmented
                value={panel}
                onChange={setPanel}
                className="w-full [&>button]:flex-1"
                options={[
                  { value: 'fields', label: 'Fields', icon: <Layers className="h-3.5 w-3.5" /> },
                  { value: 'settings', label: 'Settings', icon: <Settings2 className="h-3.5 w-3.5" /> },
                ]}
              />
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin">
              {panel === 'fields' ? <FieldPalette onAdd={addField} disabled={readOnly} pageTitle={page.title || `Page ${pageIndex + 1}`} /> : <SettingsPanel form={draft} onChange={setDraft} readOnly={readOnly} />}
            </div>
          </aside>

          {/* ---------------- Main workspace (Pages editor) ---------------- */}
          <section className="flex-1 min-w-0 flex flex-col">
            <div className="shrink-0 flex items-center gap-1.5 px-6 h-14 border-b border-line bg-white/70 backdrop-blur overflow-x-auto scroll-thin">
              {draft.pages.map((p, i) => (
                <button
                  key={p.id}
                  draggable={!readOnly}
                  onDragStart={() => setDrag({ kind: 'page', id: p.id })}
                  onDragOver={(e) => {
                    if (drag?.kind !== 'page') return
                    e.preventDefault()
                    setOver(p.id)
                  }}
                  onDrop={() => {
                    if (drag?.kind === 'page') movePage(drag.id, p.id)
                    setDrag(null)
                    setOver(null)
                  }}
                  onDragEnd={() => {
                    setDrag(null)
                    setOver(null)
                  }}
                  onClick={() => {
                    setPageId(p.id)
                    setSelected(null)
                  }}
                  className={cx(
                    'group shrink-0 inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-lg text-[13px] font-semibold transition-colors',
                    p.id === page.id ? 'bg-brand-600 text-white shadow-card' : 'bg-white text-ink ring-1 ring-line hover:ring-brand-300',
                    drag?.kind === 'page' && over === p.id && 'ring-2 ring-brand-500',
                  )}
                >
                  <GripVertical className={cx('h-3.5 w-3.5', p.id === page.id ? 'text-white/60' : 'text-[#b4bec8]')} />
                  {p.title || `Page ${i + 1}`}
                  <span className={cx('ml-1 text-[11px] font-bold rounded px-1', p.id === page.id ? 'bg-white/20' : 'bg-canvas text-muted')}>{p.fields.length}</span>
                </button>
              ))}
              {!readOnly && (
                <button onClick={addPage} className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[13px] font-semibold text-brand-700 hover:bg-brand-50">
                  <Plus className="h-4 w-4" /> Page
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin dot-grid" onClick={() => setSelected(null)}>
              <div className="max-w-[760px] mx-auto px-6 py-8 space-y-3">
                <PageCard
                  page={page}
                  index={pageIndex}
                  canDelete={draft.pages.length > 1}
                  readOnly={readOnly}
                  onChange={updatePage}
                  onDelete={() => (page.fields.length ? setConfirmPageDelete(page) : deletePage(page))}
                />
                {page.fields.length === 0 ? (
                  <EmptyPage />
                ) : (
                  page.fields.map((f) => (
                    <div id={`card-${f.id}`} key={f.id}>
                      <FieldCard
                        field={f}
                        selected={selected === f.id}
                        readOnly={readOnly}
                        logicLocked={pageHasLogic(page, f.id)}
                        dragging={drag?.kind === 'field' && drag.id === f.id}
                        dropBefore={drag?.kind === 'field' && over === f.id && drag.id !== f.id}
                        onSelect={() => setSelected(f.id)}
                        onChange={updateField}
                        onDuplicate={() => duplicateField(f)}
                        onDelete={() => removeField(f.id)}
                        onLogic={() => setLogicFor(f.id)}
                        sourceLabel={allFields.find((x) => x.id === f.condition?.sourceId)?.label}
                        pageName={pageName}
                        dragProps={
                          readOnly
                            ? {}
                            : {
                                draggable: true,
                                onDragStart: (e) => {
                                  e.dataTransfer.effectAllowed = 'move'
                                  setDrag({ kind: 'field', id: f.id })
                                },
                                onDragOver: (e) => {
                                  if (drag?.kind !== 'field') return
                                  e.preventDefault()
                                  setOver(f.id)
                                },
                                onDrop: (e) => {
                                  e.preventDefault()
                                  if (drag?.kind === 'field') moveField(drag.id, f.id)
                                  setDrag(null)
                                  setOver(null)
                                },
                                onDragEnd: () => {
                                  setDrag(null)
                                  setOver(null)
                                },
                              }
                        }
                      />
                    </div>
                  ))
                )}
                {page.fields.length > 0 && !readOnly && (
                  <div
                    onDragOver={(e) => {
                      if (drag?.kind !== 'field') return
                      e.preventDefault()
                      setOver('__end')
                    }}
                    onDrop={() => {
                      if (drag?.kind === 'field') moveField(drag.id, null)
                      setDrag(null)
                      setOver(null)
                    }}
                    className={cx('h-14 rounded-2xl border-2 border-dashed grid place-items-center text-xs font-semibold transition-colors', over === '__end' ? 'border-brand-400 text-brand-700 bg-brand-50/50' : 'border-transparent text-muted/70')}
                  >
                    {drag?.kind === 'field' ? 'Drop here to move to the end' : 'Pick a field on the left to add it here'}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <PreviewPane form={draft} />
      )}

      <LogicModal
        form={draft}
        field={logicField}
        onClose={() => setLogicFor(null)}
        onSave={(patch) => {
          if (logicField) updateField({ ...logicField, ...patch })
          setLogicFor(null)
        }}
      />
      <ConfirmDialog
        open={leaving}
        title="Changes have not been saved"
        description="Are you sure you want to lose your changes?"
        confirmLabel="Continue"
        tone="danger"
        onCancel={() => setLeaving(false)}
        onConfirm={() => router.push('/forms/')}
      />
      <ConfirmDialog
        open={!!confirmPageDelete}
        title={`Delete ${confirmPageDelete?.title || 'page'}?`}
        description={`This removes the page and its ${confirmPageDelete?.fields.length} field${confirmPageDelete?.fields.length === 1 ? '' : 's'}. Any page jumps pointing to it will be removed.`}
        confirmLabel="Delete page"
        tone="danger"
        onCancel={() => setConfirmPageDelete(null)}
        onConfirm={() => confirmPageDelete && deletePage(confirmPageDelete)}
      />
      {fa.dialogs}
    </div>
  )
}

function FieldPalette({ onAdd, disabled, pageTitle }: { onAdd: (t: FieldType, k?: DynamicKey) => void; disabled: boolean; pageTitle: string }) {
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-2 px-1">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  )
  const Item = ({ type, label, k }: { type: FieldType; label: string; k?: DynamicKey }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(type, k)}
      className="group flex items-center gap-2 h-10 px-2.5 rounded-xl text-left text-[12.5px] font-semibold text-ink/85 ring-1 ring-inset ring-line bg-white hover:ring-brand-300 hover:bg-brand-50/60 hover:text-brand-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className={cx('grid place-items-center h-6 w-6 rounded-md transition-colors', type === 'dynamic' ? 'bg-violet-50 text-violet-600' : 'bg-canvas text-muted group-hover:bg-white group-hover:text-brand-600')}>
        <FieldIcon type={type} className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
  return (
    <div className="p-4">
      <p className="text-sm font-bold">Add Field</p>
      <p className="text-xs text-muted mt-0.5 mb-4">
        Adds to the bottom of <span className="font-semibold text-ink">{pageTitle}</span>
      </p>
      <Group title="Basic">
        {FIELD_CATALOG.filter((f) => f.group === 'basic').map((f) => (
          <Item key={f.type} type={f.type} label={f.label} />
        ))}
      </Group>
      <Group title="Choice">
        {FIELD_CATALOG.filter((f) => f.group === 'choice').map((f) => (
          <Item key={f.type} type={f.type} label={f.label} />
        ))}
      </Group>
      <Group title="Patient record">
        {DYNAMIC_FIELDS.map((d) => (
          <Item key={d.key} type="dynamic" label={d.label} k={d.key} />
        ))}
      </Group>
      <div className="rounded-xl bg-canvas p-3 text-xs text-muted leading-relaxed flex gap-2">
        <Info className="h-4 w-4 shrink-0 text-brand-600" />
        Patient record fields are read-only and pulled from the Outcome Form for each appointment.
      </div>
    </div>
  )
}

function PreviewPane({ form }: { form: Form }) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<Answers | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const restart = () => {
    setResult(null)
    setShowSummary(false)
    setRun((r) => r + 1)
  }
  const ctx = { patient: SAMPLE }
  const body = result ? (
    showSummary ? (
      <div className="p-5 bg-white min-h-full">
        <h2 className="text-lg font-bold">Your responses</h2>
        <p className="text-sm text-muted mb-5">Read-only preview, grouped by page in the order completed.</p>
        <AnswerSheet form={form} answers={result} ctx={ctx} />
        <Button className="mt-6 w-full" onClick={restart} icon={<RotateCcw className="h-4 w-4" />}>
          Start again
        </Button>
      </div>
    ) : (
      <SubmissionReceived message={form.settings.confirmationMessage} accent={form.settings.buttonColor} onClose={() => setShowSummary(true)} />
    )
  ) : (
    <FormRunner key={run} form={form} device={device} ctx={ctx} onSubmit={setResult} />
  )

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 overflow-y-auto scroll-thin dot-grid">
        <div className="sticky top-0 z-10 flex items-center justify-center gap-3 py-4 bg-gradient-to-b from-canvas via-canvas/90 to-transparent">
          <Segmented
            value={device}
            onChange={(d) => {
              setDevice(d)
              restart()
            }}
            size="sm"
            options={[
              { value: 'mobile', label: 'Mobile', icon: <Smartphone className="h-3.5 w-3.5" /> },
              { value: 'desktop', label: 'Desktop', icon: <Monitor className="h-3.5 w-3.5" /> },
            ]}
          />
          <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={restart}>
            Restart
          </Button>
        </div>
        <div className="flex justify-center px-6 pb-12">
          {device === 'mobile' ? (
            <Phone>
              <div className="absolute inset-0 overflow-y-auto scroll-thin">{body}</div>
            </Phone>
          ) : (
            <div className="w-full max-w-[720px]">{body}</div>
          )}
        </div>
      </div>
      <FormFacts form={form} />
    </div>
  )
}

function FormFacts({ form }: { form: Form }) {
  const db = useDB()
  const subs = db.submissions.filter((s) => s.formId === form.id)
  const linked = db.appointments.filter((a) => a.formIds.includes(form.id)).length
  const owner = userFor(form.createdBy)
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 text-[13px]">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold text-right">{v}</dd>
    </div>
  )
  return (
    <aside className="hidden xl:block w-[300px] shrink-0 bg-white border-l border-line overflow-y-auto scroll-thin">
      <div className="p-5 border-b border-line">
        <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">Form details</p>
        <dl className="divide-y divide-line">
          {row('Status', <StatusPill status={form.status} />)}
          {row('Category', form.settings.category || '—')}
          {row('Pages', form.pages.length)}
          {row('Questions', form.pages.flatMap((p) => p.fields).length)}
          {row('Owner', `${owner.name}`)}
          {row('Role', ROLE_LABEL[owner.role])}
        </dl>
      </div>
      <div className="p-5 border-b border-line">
        <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">Distribution</p>
        <dl className="divide-y divide-line">
          {row('Trigger', form.settings.trigger)}
          {row('Reminders', form.settings.notificationTiming.join(', ') || 'None')}
          {row('Template', <span className="font-mono text-[11.5px]">{form.settings.notificationTemplate}</span>)}
          {row('Deep link', form.settings.deepLink ? 'On' : 'Off')}
          {row('Verification', form.settings.anonymous ? 'Anonymous' : 'Name + DOB')}
        </dl>
        <p className="text-xs text-muted mt-3 mb-1.5">Units & services</p>
        <div className="flex flex-wrap gap-1.5">
          {serviceNames(form.settings.services).map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
          {!form.settings.services.length && <span className="text-xs text-muted">None selected</span>}
        </div>
      </div>
      <div className="p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted mb-3">Activity</p>
        <dl className="divide-y divide-line">
          {row('Linked appointments', linked)}
          {row('Submissions', subs.length)}
          {row('Action required', <span className={subs.some((s) => s.actionRequired) ? 'text-rose-600' : ''}>{subs.filter((s) => s.actionRequired).length}</span>)}
          {row('Last edited', fmtDate(form.updatedAt))}
          {form.publishedAt && row('Published', fmtDate(form.publishedAt))}
          {form.expiresAt && row('Expires', fmtDate(form.expiresAt))}
        </dl>
        <div className="mt-4 rounded-xl bg-canvas p-3 text-xs text-muted flex gap-2">
          <ClipboardCheck className="h-4 w-4 shrink-0 text-brand-600" />
          Preview uses sample patient data from {HEALTH_NETWORK.name}. Nothing you submit here is saved.
        </div>
      </div>
    </aside>
  )
}
