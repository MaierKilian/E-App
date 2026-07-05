import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { DemoBanner } from '@/features/demo/DemoBanner'

/**
 * Grundgerüst der App: feste Kopfzeile, scrollbarer Inhaltsbereich und
 * (auf Mobilgeräten) die untere Navigationsleiste.
 */
export function Layout() {
  return (
    <div className="min-h-[100dvh] text-foreground flex flex-col">
      <div className="app-backdrop" aria-hidden="true" />
      <Header />
      <DemoBanner />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
