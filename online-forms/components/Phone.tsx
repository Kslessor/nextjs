import type { ReactNode } from 'react'
import { cx } from '@/lib/util'

/** A device frame so patient journeys can be shown inside team tools. */
export function Phone({ children, className, dark, time = '9:41' }: { children: ReactNode; className?: string; dark?: boolean; time?: string }) {
  return (
    <div className={cx('relative w-[340px] h-[700px] shrink-0 rounded-[52px] bg-[#0f1216] p-[11px] shadow-[0_40px_80px_-20px_rgba(15,18,22,.45),inset_0_0_0_1.5px_#2b3038]', className)}>
      <div className="relative h-full w-full rounded-[42px] overflow-hidden bg-white flex flex-col">
        <div className={cx('relative z-20 flex items-center justify-between px-7 pt-3 pb-1 text-[13px] font-semibold shrink-0', dark ? 'text-white' : 'text-ink')}>
          <span>{time}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-2 h-[26px] w-[96px] rounded-full bg-black" />
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor" aria-hidden>
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="5" width="3" height="7" rx="1" />
              <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg viewBox="0 0 26 12" className="h-3 w-[26px]" aria-hidden>
              <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
              <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" />
              <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
            </svg>
          </span>
        </div>
        <div className="relative flex-1 min-h-0">{children}</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-[5px] w-[120px] rounded-full bg-black/80 z-30" />
      </div>
    </div>
  )
}

/** Browser chrome for the “opened from SMS/email link” journey. */
export function BrowserFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-2xl bg-white shadow-lift ring-1 ring-black/5 overflow-hidden flex flex-col', className)}>
      <div className="flex items-center gap-3 px-4 h-11 bg-[#eef1f4] border-b border-line shrink-0">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="flex-1 mx-auto max-w-md h-7 rounded-lg bg-white text-[12px] text-muted flex items-center justify-center gap-1.5 truncate px-3">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-canvas">{children}</div>
    </div>
  )
}
