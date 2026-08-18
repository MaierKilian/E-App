import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './Layout'
import { useApplyTheme } from './useApplyTheme'
import { track, syncAnalyticsConsent } from '@/features/analytics/analytics'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { MeasurementsPage } from '@/features/measurements/MeasurementsPage'
import { MeasurementRunner } from '@/features/measurements/MeasurementRunner'
import { MonitoringPage } from '@/features/monitoring/MonitoringPage'
import { MeterDetailPage } from '@/features/monitoring/MeterDetailPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { EducationPage } from '@/features/education/EducationPage'
import { LearnPage } from '@/features/education/flashcards/LearnPage'
import { StatsView } from '@/features/education/flashcards/StatsView'
import { TipsPage } from '@/features/tips/TipsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { DataResetPage } from '@/features/settings/DataResetPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { JoinProfilePage } from '@/features/profiles/JoinProfilePage'
import { SplashScreen } from '@/components/SplashScreen'
import { OnboardingIntro } from '@/components/OnboardingIntro'
import { DemoLoader } from '@/features/demo/DemoLoader'
import { LoginGate } from '@/components/LoginGate'
import { LandingPage } from '@/features/landing/LandingPage'
import { useSettingsStore } from '@/store/settingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'

/**
 * Meldet jeden Seitenwechsel als Analytics-Ereignis „page_view".
 * Muss innerhalb des Routers stehen (nutzt useLocation).
 */
function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    void track('page_view', { page_path: location.pathname })
  }, [location.pathname])
  return null
}

/**
 * Einstieg auf „/": Erst-Besucher sehen die Landing Page, Wiederkehrer werden
 * direkt weitergeleitet. Als „schon dabei" gilt, wer die Einführung/Landing
 * bereits gesehen hat (`introSeen`), ein fertiges Profil besitzt
 * (`data.completed`) oder gerade die Demo betrachtet (`demoMode`).
 */
function LandingRoute() {
  const introSeen = useSettingsStore((s) => s.introSeen)
  const demoMode = useSettingsStore((s) => s.demoMode)
  const completed = useOnboardingStore((s) => s.data.completed)

  if (introSeen || demoMode || completed) {
    return <Navigate to="/onboarding" replace />
  }
  return <LandingPage />
}

export function App() {
  useApplyTheme()

  // Analytics-Einwilligung (Opt-out) beim Start und bei jeder Änderung auf
  // Firebase Analytics übertragen, damit auch automatische Ereignisse folgen.
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled)
  useEffect(() => {
    void syncAnalyticsConsent()
  }, [analyticsEnabled])

  return (
    <>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <RouteTracker />
        <DemoLoader />
        <OnboardingIntro />
        <Routes>
          {/* Öffentliche Landing Page ohne App-Chrome (eigene Topbar). */}
          <Route path="/" element={<LandingRoute />} />
          {/* Fester Vorschau-Einstieg (z. B. aus den Einstellungen), immer sichtbar. */}
          <Route path="/willkommen" element={<LandingPage preview />} />
          <Route element={<Layout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/measurements" element={<LoginGate><MeasurementsPage /></LoginGate>} />
            <Route path="/measurements/:id" element={<LoginGate><MeasurementRunner /></LoginGate>} />
            <Route path="/monitoring" element={<LoginGate><MonitoringPage /></LoginGate>} />
            <Route path="/monitoring/:type" element={<LoginGate><MeterDetailPage /></LoginGate>} />
            <Route path="/reports" element={<LoginGate><ReportsPage /></LoginGate>} />
            <Route path="/education" element={<EducationPage />} />
            {/* Täglicher Einstieg in den Karteikarten-Trainer – bewusst eine
                eigene Route und nicht fünf Ebenen tief im Wissensbereich. */}
            <Route path="/lernen" element={<LearnPage />} />
            <Route path="/lernen/statistik" element={<StatsView />} />
            <Route path="/tipps" element={<TipsPage />} />
            <Route path="/einstellungen" element={<SettingsPage />} />
            <Route path="/einstellungen/daten" element={<DataResetPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join/:pid/:inviteId" element={<JoinProfilePage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <SplashScreen />
    </>
  )
}
