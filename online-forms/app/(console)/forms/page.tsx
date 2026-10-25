'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CirclePlus, ExternalLink, Link2, MoreHorizontal, Search, User2, SearchX, CalendarClock, LayoutGrid, Rows3 } from 'lucide-react'
import type { Form, FormStatus } from '@/lib/types'
import { useDB, userFor } from '@/lib/store'
import { CATEGORIES } from '@/lib/seed'
import { can } from '@/lib/permissions'
import { cx, fmtDate, truncate, withBase } from '@/lib/util'
import { PageHeader } from '@/components/Shell'
import { Button, Card, IconButton, Menu, Segmented, Select, StatusPill, Tag, useToast } from '@/components/ui'
import { formLink, useFormActions } from '@/components/FormActions'

const STATUSES: { value: '' | FormStatus; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'expired', label: 'Expired' },
  { value: 'archived', label: 'Archived' },
]

export default function FormsPage() {
  const db = useDB()
  const me = userFor(db.currentUser)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | FormStatus>('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const fa = useFormActions()

  const visible = db.forms.filter((f) => f.status !== 'archived')
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.forms
      .filter((f) => (status ? f.status === status : f.status !== 'archived'))
      .filter((f) => !category || f.settings.category === category)
      .filter((f) => !needle || f.title.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [db.forms, q, status, category])

  const counts = (s: FormStatus) => db.forms.filter((f) => f.status === s).length
  const create = () => router.push('/builder/?id=new')
  // Archived forms live in their own table (spec §11.4.6).
  const asTable = view === 'table' || status === 'archived'

  return (
    <div className="px-5 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      <PageHeader
        title="Forms"
        subtitle={`${visible.length} form${visible.length === 1 ? '' : 's'} total`}
        actions={
          can(me, 'create') && (
            <Button variant="primary" size="lg" icon={<CirclePlus className="h-[18px] w-[18px]" />} onClick={create}>
              Create Form
            </Button>
          )
        }
      />

      {db.forms.length === 0 ? (
        <EmptyForms onCreate={create} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search forms..."
                aria-label="Search forms"
                className="w-full h-10 rounded-lg border border-line bg-white pl-9 pr-3 text-sm placeholder:text-muted/70 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
            <div className="w-[170px]">
              <Select value={status} onChange={(e) => setStatus(e.target.value as FormStatus | '')} aria-label="Status filter">
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                    {s.value ? ` (${counts(s.value as FormStatus)})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[190px]">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="ml-auto">
              <Segmented
                value={asTable ? 'table' : 'grid'}
                onChange={setView}
                size="sm"
                options={[
                  { value: 'grid', label: <span className="sr-only">Cards</span>, icon: <LayoutGrid className="h-4 w-4" />, disabled: status === 'archived' },
                  { value: 'table', label: <span className="sr-only">Table</span>, icon: <Rows3 className="h-4 w-4" /> },
                ]}
              />
            </div>
          </div>

          {status === 'archived' && (
            <p className="mb-4 -mt-2 text-[13px] text-muted">Archived forms can’t be submitted and only appear in this table.</p>
          )}

          {results.length === 0 ? (
            <Card className="py-20 text-center">
              <SearchX className="mx-auto h-10 w-10 text-muted/50" />
              <p className="mt-3 font-semibold">No results found</p>
              <p className="text-sm text-muted mt-1">Try a different search or clear the filters.</p>
              <Button
                className="mt-5"
                onClick={() => {
                  setQ('')
                  setStatus('')
                  setCategory('')
                }}
              >
                Clear filters
              </Button>
            </Card>
          ) : asTable ? (
            <FormTable forms={results} fa={fa} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((f) => (
                <FormCard key={f.id} form={f} fa={fa} subs={db.submissions.filter((s) => s.formId === f.id).length} />
              ))}
            </div>
          )}
        </>
      )}
      {fa.dialogs}
    </div>
  )
}

function FormCard({ form: f, fa, subs }: { form: Form; fa: ReturnType<typeof useFormActions>; subs: number }) {
  const router = useRouter()
  const toast = useToast()
  const pages = f.pages.length
  const live = f.status === 'published'

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/builder/?id=${f.id}${f.status === 'draft' ? '' : '&tab=preview'}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/builder/?id=${f.id}`)}
      className="group relative flex flex-col bg-white rounded-2xl border border-line shadow-card hover:shadow-lift hover:border-brand-200 transition-all duration-200 cursor-pointer"
    >
      <div className={cx('absolute inset-x-0 top-0 h-1 rounded-t-2xl', live ? 'bg-gradient-to-r from-brand-400 to-brand-600' : 'bg-transparent')} />
      <div className="p-5 pb-4 flex-1">
        <div className="flex items-start gap-3">
          <h3 className="flex-1 min-w-0 text-[15.5px] font-bold text-ink leading-snug group-hover:text-brand-700 transition-colors">{f.title}</h3>
          <Menu
            items={fa.items(f)}
            trigger={({ toggle, open }) => (
              <IconButton label="More actions" onClick={toggle} className={cx('-mr-2 -mt-1', open && 'bg-black/5 text-ink')}>
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </IconButton>
            )}
          />
        </div>
        <p className="text-[13px] text-muted mt-1 leading-relaxed min-h-[40px]">{truncate(f.description || 'No description', 96)}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted mt-3">
          <User2 className="h-3.5 w-3.5" /> {f.createdBy}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3.5">
          <StatusPill status={f.status} />
          {f.settings.category && <Tag>{f.settings.category}</Tag>}
          {subs > 0 && <Tag className="text-brand-700 ring-brand-200 bg-brand-50">{subs} submission{subs === 1 ? '' : 's'}</Tag>}
        </div>
      </div>
      <div className="flex items-center gap-2 min-h-[56px] px-5 py-3 border-t border-line text-xs text-muted">
        <span className="font-medium">
          {pages} page{pages === 1 ? '' : 's'} · v{f.version}
        </span>
        <span className="flex-1" />
        {live ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              icon={<Link2 className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard?.writeText(formLink(f))
                toast({ title: 'Link copied', body: 'Paste it into an SMS or email template.' })
              }}
            >
              Copy Link
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation()
                window.open(withBase(`/f/?form=${f.id}`), '_blank')
              }}
            >
              Open Form
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            {cardDate(f)}
          </span>
        )}
      </div>
      {live && (
        <div className="px-5 pb-3 -mt-1 flex justify-between text-[11.5px] text-muted">
          <span>Published on: {fmtDate(f.publishedAt)}</span>
          <span>{f.expiresAt ? `Expires on: ${fmtDate(f.expiresAt)}` : 'No expiry'}</span>
        </div>
      )}
    </div>
  )
}

function cardDate(f: Form): string {
  switch (f.status) {
    case 'draft':
      return `Last edited: ${fmtDate(f.updatedAt)}`
    case 'unpublished':
      return `Unpublished on: ${fmtDate(f.unpublishedAt)}`
    case 'expired':
      return `Expired on: ${fmtDate(f.expiredAt)}`
    case 'archived':
      return `Archived on: ${fmtDate(f.archivedAt)}`
    default:
      return `Published on: ${fmtDate(f.publishedAt)}`
  }
}

function FormTable({ forms, fa }: { forms: Form[]; fa: ReturnType<typeof useFormActions> }) {
  const router = useRouter()
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
            <th className="px-5 py-3">Form</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Pages</th>
            <th className="px-3 py-3">Owner</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {forms.map((f) => (
            <tr key={f.id} className="hover:bg-canvas/70 cursor-pointer" onClick={() => router.push(`/builder/?id=${f.id}&tab=preview`)}>
              <td className="px-5 py-3.5">
                <p className="font-semibold">{f.title}</p>
                <p className="text-xs text-muted mt-0.5">{truncate(f.description, 70)}</p>
              </td>
              <td className="px-3">
                <StatusPill status={f.status} />
              </td>
              <td className="px-3 text-muted">{f.settings.category || '—'}</td>
              <td className="px-3 text-muted">{f.pages.length}</td>
              <td className="px-3 text-muted">{f.createdBy.split('@')[0]}</td>
              <td className="px-3 text-muted whitespace-nowrap">{cardDate(f)}</td>
              <td className="px-3">
                <Menu
                  items={fa.items(f)}
                  trigger={({ toggle }) => (
                    <IconButton label="More actions" onClick={toggle}>
                      <MoreHorizontal className="h-4 w-4" />
                    </IconButton>
                  )}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function EmptyForms({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="dot-grid py-24 text-center overflow-hidden">
      <div className="relative mx-auto h-40 w-52">
        <div className="absolute left-6 top-4 h-32 w-28 rounded-xl bg-white border border-line shadow-card -rotate-[8deg]" />
        <div className="absolute right-6 top-4 h-32 w-28 rounded-xl bg-white border border-line shadow-card rotate-[8deg]" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-36 w-28 rounded-xl bg-white border border-line shadow-lift p-3 space-y-2">
          <div className="h-2 w-16 rounded bg-[#e3e8ec]" />
          <div className="h-2 w-12 rounded bg-[#e3e8ec]" />
          <div className="h-6 w-full rounded-md bg-brand-50 ring-1 ring-brand-100" />
          <div className="h-2 w-14 rounded bg-[#e3e8ec]" />
          <div className="h-6 w-full rounded-md bg-canvas ring-1 ring-line" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 grid place-items-center h-12 w-12 rounded-full bg-brand-600 text-white ring-[6px] ring-white shadow-lift">
          <CalendarClock className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-6 text-[15px] text-ink">You have not created any forms yet.</p>
      <p className="text-[15px] text-ink">
        Select <strong>Create Form</strong> to add a new form.
      </p>
      <Button variant="primary" className="mt-6" icon={<CirclePlus className="h-4 w-4" />} onClick={onCreate}>
        Create Form
      </Button>
      <p className="mt-4 text-xs text-muted">Or use Reset demo data in the sidebar to load sample forms.</p>
    </Card>
  )
}
