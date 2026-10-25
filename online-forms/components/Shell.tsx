'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronsUpDown, ClipboardList, History, LayoutDashboard, LogOut, MonitorSmartphone, RotateCcw, Stethoscope, Check } from 'lucide-react'
import { actions, useDB, userFor } from '@/lib/store'
import { USERS } from '@/lib/seed'
import { can, ROLE_LABEL } from '@/lib/permissions'
import { cx } from '@/lib/util'
import { Bands, NexaLogo } from './brand'
import { ConfirmDialog, useToast } from './ui'

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, section: 'Workspace' },
  { href: '/forms', label: 'Forms', icon: ClipboardList, section: 'Workspace', sub: 'Online Forms Editor' },
  { href: '/qflow', label: 'Service Console', icon: Stethoscope, section: 'Q-Flow', sub: 'Case & calendar lists' },
  { href: '/visitplus', label: 'VisitPlus', icon: MonitorSmartphone, section: 'Patient experience', sub: 'App & browser journeys' },
  { href: '/audit', label: 'Audit log', icon: History, section: 'Workspace', admin: true },
]

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cx('grid place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white font-bold', className)}>{initials(name)}</span>
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const db = useDB()
  const me = userFor(db.currentUser)
  const [switcher, setSwitcher] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const toast = useToast()

  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))
  const sections = ['Workspace', 'Q-Flow', 'Patient experience']

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden lg:flex w-[264px] flex-col bg-slate-900 text-white overflow-hidden">
        <Bands className="absolute -bottom-10 -left-10 h-[420px] w-[420px]" />
        <div className="relative px-6 pt-6 pb-5">
          <Link href="/" className="flex items-center gap-3">
            <NexaLogo className="h-[22px]" />
            <span className="h-5 w-px bg-white/15" />
            <span className="text-[13px] font-semibold tracking-wide text-white/80">Online Forms</span>
          </Link>
        </div>

        <nav className="relative flex-1 px-3 space-y-5 overflow-y-auto scroll-thin">
          {sections.map((s) => (
            <div key={s}>
              <p className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-[.14em] text-white/35">{s}</p>
              {NAV.filter((n) => n.section === s && (!n.admin || can(me, 'audit'))).map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                    active(n.href) ? 'bg-white/[.09] text-white' : 'text-white/65 hover:text-white hover:bg-white/[.05]',
                  )}
                >
                  <span className={cx('grid place-items-center h-8 w-8 rounded-lg transition-colors', active(n.href) ? 'bg-brand-500 text-white' : 'bg-white/[.06] text-white/70 group-hover:text-white')}>
                    <n.icon className="h-[17px] w-[17px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{n.label}</span>
                    {n.sub && <span className="block text-[11.5px] text-white/40 leading-tight mt-0.5 truncate">{n.sub}</span>}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="relative p-3 space-y-1">
          <button
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 h-9 text-[12.5px] font-medium text-white/50 hover:text-white hover:bg-white/[.05]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
          </button>
          <div className="relative">
            <button
              onClick={() => setSwitcher((s) => !s)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/[.06] hover:bg-white/[.09] px-3 py-2.5 text-left ring-1 ring-white/10"
            >
              <Avatar name={me.name} className="h-9 w-9 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{me.name}</span>
                <span className="block text-[11.5px] text-brand-300 font-medium">{ROLE_LABEL[me.role]}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-white/40" />
            </button>
            {switcher && (
              <div className="absolute bottom-full mb-2 left-0 right-0 rounded-xl bg-white text-ink p-1.5 shadow-pop animate-rise-in">
                <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Switch role (demo)</p>
                {USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => {
                      actions.setUser(u.email)
                      setSwitcher(false)
                      toast({ title: `Signed in as ${u.name}`, body: ROLE_LABEL[u.role], tone: 'info' })
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-canvas text-left"
                  >
                    <Avatar name={u.name} className="h-8 w-8 text-[11px]" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{u.name}</span>
                      <span className="block text-xs text-muted">{ROLE_LABEL[u.role]}</span>
                    </span>
                    {u.email === me.email && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                ))}
                <div className="my-1 h-px bg-line" />
                <p className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted">
                  <LogOut className="h-3.5 w-3.5" /> Auth is handled by Q-Flow SSO
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Compact top bar for small screens */}
      <header className="no-print lg:hidden sticky top-0 z-30 bg-slate-900 text-white">
        <div className="flex items-center gap-3 px-4 h-14">
          <NexaLogo className="h-5" />
          <span className="text-[13px] font-semibold text-white/80">Online Forms</span>
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto scroll-thin">
          {NAV.filter((n) => !n.admin || can(me, 'audit')).map((n) => (
            <Link key={n.href} href={n.href} className={cx('shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold', active(n.href) ? 'bg-white/10' : 'text-white/60')}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        description="This restores the sample forms, appointments and submissions. Anything you’ve built in this browser will be cleared."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.reset()
          setConfirmReset(false)
          toast({ title: 'Demo data restored' })
        }}
      />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions: right, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-600 mb-2">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-[14px] text-muted mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
