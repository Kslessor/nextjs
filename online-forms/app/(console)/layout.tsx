import { Shell } from '@/components/Shell'
import { ClientOnly } from '@/components/ClientOnly'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallback={<div className="min-h-screen lg:pl-[264px]"><div className="hidden lg:block fixed inset-y-0 left-0 w-[264px] bg-slate-900" /></div>}>
      <Shell>{children}</Shell>
    </ClientOnly>
  )
}
