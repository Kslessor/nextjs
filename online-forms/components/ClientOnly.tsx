'use client'

import type { ReactNode } from 'react'
import { useMounted } from './ui'

/** Data lives in localStorage, so render after mount to avoid hydration drift. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useMounted() ? <>{children}</> : <>{fallback}</>
}
