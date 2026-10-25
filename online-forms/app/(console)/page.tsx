'use client'

import Link from 'next/link'
import { ArrowRight, ClipboardList, Link2, MonitorSmartphone, Send, Stethoscope, CirclePlus, Rocket, AlertTriangle, ChevronRight } from 'lucide-react'
import { formStateFor, useDB, userFor } from '@/lib/store'
import { can } from '@/lib/permissions'
import { cx, fmtTime, relTime } from '@/lib/util'
import { Card, StatusPill } from '@/components/ui'
import { FormStateIcon, Bands } from '@/components/brand'
import { AuditList } from '@/components/FormActions'

export default function Overview() {
  const db = useDB()
  const me = userFor(db.currentUser)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const links = db.appointments.flatMap((a) => a.formIds.map((fid) => ({ a, fid, ...formStateFor(db, a.id, fid) })))
  const submitted = links.filter((l) => l.submission).length
  const action = links.filter((l) => l.state === 'action')
  const rate = links.length ? Math.round((submitted / links.length) * 100) : 0
  const published = db.forms.filter((f) => f.status === 'published')
  const patient = (id: string) => db.patients.find((p) => p.id === id)!

  return (
    <div className="px-5 sm:px-8 lg:px-10 py-8 max-w-[1400px]">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white px-8 py-9 mb-8">
        <Bands className="absolute -right-10 -top-10 h-[360px] w-[520px] rotate-180" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-300">Online Forms v1.0</p>
            <h1 className="text-[32px] font-extrabold tracking-tight mt-2">
              {greet}, {me.name.split(' ')[0]}
            </h1>
            <p className="text-white/65 mt-1 max-w-xl">
              Build forms, link them to appointments in Q-Flow, and see patient responses the moment they arrive.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can(me, 'create') && (
              <Link href="/builder/?id=new" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-500 hover:bg-brand-400 font-bold text-[15px] transition-colors">
                <CirclePlus className="h-[18px] w-[18px]" /> Create Form
              </Link>
            )}
            <Link href="/qflow" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 font-semibold text-[15px]">
              <Stethoscope className="h-[18px] w-[18px]" /> Service Console
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Published forms" value={published.length} sub={`${db.forms.filter((f) => f.status === 'draft').length} drafts in progress`} icon={<Rocket className="h-5 w-5" />} />
        <Kpi label="Forms sent to patients" value={links.length} sub="Linked to appointments" icon={<Send className="h-5 w-5" />} />
        <Kpi label="Completion rate" value={`${rate}%`} sub={`${submitted} of ${links.length} submitted`} icon={<ClipboardList className="h-5 w-5" />} bar={rate} />
        <Kpi label="Action required" value={action.length} sub="Flagged answers to follow up" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" href="/qflow" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="font-bold">Needs attention</h2>
              <Link href="/qflow" className="text-[13px] font-semibold text-brand-700 hover:underline">
                Open Service Console
              </Link>
            </div>
            {action.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">Nothing flagged — every completed form is clear. 🎉</p>
            ) : (
              <ul className="divide-y divide-line">
                {action.map(({ a, submission }) => {
                  const p = patient(a.patientId)
                  return (
                    <li key={submission!.id} className="flex items-start gap-4 px-6 py-3.5">
                      <FormStateIcon state="action" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {p.firstName} {p.lastName} <span className="font-normal text-muted">· {submission!.formTitle}</span>
                        </p>
                        <p className="text-[13px] text-rose-700 mt-0.5">{submission!.actionNote}</p>
                        <p className="text-xs text-muted mt-1">
                          {a.clinic} · appt {fmtTime(a.start)} · submitted {relTime(submission!.submittedAt)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="font-bold">Live forms</h2>
              <Link href="/forms" className="text-[13px] font-semibold text-brand-700 hover:underline">
                All forms
              </Link>
            </div>
            <div className="divide-y divide-line">
              {published.map((f) => {
                const l = links.filter((x) => x.fid === f.id)
                const done = l.filter((x) => x.submission).length
                const pct = l.length ? Math.round((done / l.length) * 100) : 0
                return (
                  <Link key={f.id} href={`/builder/?id=${f.id}&tab=preview`} className="grid grid-cols-[minmax(0,1fr)_160px_auto] items-center gap-5 px-6 py-3.5 hover:bg-canvas/70">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{f.title}</p>
                      <p className="text-xs text-muted">
                        {f.settings.category} · {f.settings.trigger}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11.5px] text-muted mb-1">
                        <span>
                          {done}/{l.length} completed
                        </span>
                        <span className="font-semibold text-ink">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#edf1f4] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                )
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold mb-1">How a form travels</h2>
            <p className="text-sm text-muted mb-5">Every surface in this workspace shares the same data, so you can follow one form end to end.</p>
            <div className="grid sm:grid-cols-4 gap-3">
              {[
                { icon: ClipboardList, title: 'Build & publish', body: 'Editor: fields, pages, logic, settings.', href: '/forms' },
                { icon: Link2, title: 'Auto-link', body: 'Q-Flow attaches it to matching appointments.', href: '/qflow' },
                { icon: MonitorSmartphone, title: 'Patient completes', body: 'Via VisitPlus, push, SMS or email.', href: '/visitplus' },
                { icon: Stethoscope, title: 'Staff review', body: 'Grey → green, or red if flagged.', href: '/qflow' },
              ].map((s, i) => (
                <Link key={s.title} href={s.href} className="group relative rounded-2xl bg-canvas p-4 hover:bg-brand-50 transition-colors">
                  <span className="absolute right-4 top-4 font-mono text-[11px] text-muted">0{i + 1}</span>
                  <span className="grid place-items-center h-9 w-9 rounded-xl bg-white text-brand-600 shadow-card">
                    <s.icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 text-sm font-bold">{s.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{s.body}</p>
                  <ArrowRight className="mt-2 h-4 w-4 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="px-6 pt-5 pb-1 flex items-center justify-between">
              <h2 className="font-bold">Recent activity</h2>
              {can(me, 'audit') && (
                <Link href="/audit" className="text-[13px] font-semibold text-brand-700 hover:underline">
                  Audit log
                </Link>
              )}
            </div>
            <AuditList entries={db.audit.slice(0, 6)} showForm />
          </Card>
          <Card className="p-6">
            <h2 className="font-bold mb-4">Forms by status</h2>
            <div className="space-y-2.5">
              {(['draft', 'published', 'unpublished', 'expired', 'archived'] as const).map((s) => {
                const n = db.forms.filter((f) => f.status === s).length
                return (
                  <Link key={s} href="/forms" className="flex items-center gap-3">
                    <StatusPill status={s} className="w-[118px]" />
                    <div className="flex-1 h-2 rounded-full bg-[#edf1f4] overflow-hidden">
                      <div
                        className={cx('h-full rounded-full', { draft: 'bg-[#8794a3]', published: 'bg-emerald-500', unpublished: 'bg-amber-500', expired: 'bg-rose-500', archived: 'bg-zinc-400' }[s])}
                        style={{ width: `${db.forms.length ? (n / db.forms.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm font-bold tabular-nums">{n}</span>
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, icon, bar, tone, href }: { label: string; value: React.ReactNode; sub: string; icon: React.ReactNode; bar?: number; tone?: 'rose'; href?: string }) {
  const body = (
    <Card className={cx('p-5 h-full transition-shadow', href && 'hover:shadow-lift')}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <span className={cx('grid place-items-center h-9 w-9 rounded-xl', tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600')}>{icon}</span>
      </div>
      <p className={cx('text-[32px] font-extrabold tracking-tight leading-none mt-2 tabular-nums', tone === 'rose' && Number(value) > 0 && 'text-rose-600')}>{value}</p>
      <p className="text-xs text-muted mt-2">{sub}</p>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-[#edf1f4] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${bar}%` }} />
        </div>
      )}
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}
