'use client'

import { Suspense } from 'react'
import { ClientOnly } from '@/components/ClientOnly'
import { Builder } from '@/components/builder/Builder'

export default function BuilderPage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-canvas" />}>
      <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
        <Builder />
      </Suspense>
    </ClientOnly>
  )
}
