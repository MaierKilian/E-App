import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { DemoBanner } from '@/features/demo/DemoBanner'
import { FeedbackModal } from '@/features/feedback/FeedbackModal'
import { LegalFooter } from '@/features/legal/LegalFooter'

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
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {/* Pflichtlinks (Impressum, Datenschutz, Einwilligung) auf jeder Seite.
          Der untere Abstand hält sie über der mobilen Navigationsleiste. */}
      <LegalFooter className="mx-auto max-w-3xl pb-28 md:pb-6" />
      <BottomNav />
      {/* Genau ein Feedback-Fenster für alle Einstiegspunkte (Kopfzeile,
          Konto-Menü, Einstellungen). Gesteuert über den feedbackStore. */}
      <FeedbackModal />
    </div>
  )
}
