'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useDB, userFor } from '@/lib/store'
import { USERS } from '@/lib/seed'
import { can } from '@/lib/permissions'
import { PageHeader } from '@/components/Shell'
import { AuditList } from '@/components/FormActions'
import { Card, Select } from '@/components/ui'

export default function AuditPage() {
  const db = useDB()
  const me = userFor(db.currentUser)
  const [form, setForm] = useState('')
  const [user, setUser] = useState('')

  if (!can(me, 'audit'))
    return (
      <div className="px-10 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted/60" />
        <p className="mt-3 font-semibold">Audit logs are available to Q-Flow Admins</p>
        <p className="text-sm text-muted mt-1">Switch role from the sidebar to view them.</p>
      </div>
    )

  const titles = Array.from(new Map(db.audit.map((a) => [a.formId, a.formTitle])).entries())
  const entries = db.audit.filter((a) => (!form || a.formId === form) && (!user || a.user === user))

  return (
    <div className="px-5 sm:px-8 lg:px-10 py-8 max-w-[1000px]">
      <PageHeader title="Audit log" subtitle="Every change to every form: who, when, and what changed." />
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-72">
          <Select value={form} onChange={(e) => setForm(e.target.value)}>
            <option value="">All forms</option>
            {titles.map(([id, t]) => (
              <option key={id} value={id}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select value={user} onChange={(e) => setUser(e.target.value)}>
            <option value="">All users</option>
            {USERS.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <p className="self-center text-sm text-muted ml-auto">{entries.length} events</p>
      </div>
      <Card>
        <AuditList entries={entries} showForm />
      </Card>
    </div>
  )
}
