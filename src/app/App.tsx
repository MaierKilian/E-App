import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { useApplyTheme } from './useApplyTheme'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { MeasurementsPage } from '@/features/measurements/MeasurementsPage'
import { MeasurementRunner } from '@/features/measurements/MeasurementRunner'
import { MonitoringPage } from '@/features/monitoring/MonitoringPage'
import { MeterDetailPage } from '@/features/monitoring/MeterDetailPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { EducationPage } from '@/features/education/EducationPage'

export function App() {
  useApplyTheme()

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/measurements" element={<MeasurementsPage />} />
          <Route path="/measurements/:id" element={<MeasurementRunner />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/monitoring/:type" element={<MeterDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
