import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './Layout'
import { useApplyTheme } from './useApplyTheme'
import { track } from '@/features/analytics/analytics'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { MeasurementsPage } from '@/features/measurements/MeasurementsPage'
import { MeasurementRunner } from '@/features/measurements/MeasurementRunner'
import { MonitoringPage } from '@/features/monitoring/MonitoringPage'
import { MeterDetailPage } from '@/features/monitoring/MeterDetailPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { EducationPage } from '@/features/education/EducationPage'
import { TipsPage } from '@/features/tips/TipsPage'
import { DataResetPage } from '@/features/settings/DataResetPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { SplashScreen } from '@/components/SplashScreen'
import { OnboardingIntro } from '@/components/OnboardingIntro'
import { LoginGate } from '@/components/LoginGate'

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

export function App() {
  useApplyTheme()

  return (
    <>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <RouteTracker />
        <OnboardingIntro />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/onboarding" replace />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/measurements" element={<LoginGate><MeasurementsPage /></LoginGate>} />
            <Route path="/measurements/:id" element={<LoginGate><MeasurementRunner /></LoginGate>} />
            <Route path="/monitoring" element={<LoginGate><MonitoringPage /></LoginGate>} />
            <Route path="/monitoring/:type" element={<LoginGate><MeterDetailPage /></LoginGate>} />
            <Route path="/reports" element={<LoginGate><ReportsPage /></LoginGate>} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/tipps" element={<TipsPage />} />
            <Route path="/einstellungen/daten" element={<DataResetPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <SplashScreen />
    </>
  )
}
