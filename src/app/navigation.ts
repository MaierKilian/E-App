import { ClipboardList, Ruler, LineChart, FileText, GraduationCap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  id: string
  path: string
  icon: LucideIcon
  labelKey: string
}

/**
 * Zentrale Definition der Hauptbereiche. Wird sowohl von der Kopfzeile
 * (Desktop) als auch von der unteren Navigationsleiste (Mobil) genutzt,
 * damit die Navigation nur an einer Stelle gepflegt werden muss.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'onboarding', path: '/onboarding', icon: ClipboardList, labelKey: 'nav.onboarding' },
  { id: 'measurements', path: '/measurements', icon: Ruler, labelKey: 'nav.measurements' },
  { id: 'monitoring', path: '/monitoring', icon: LineChart, labelKey: 'nav.monitoring' },
  { id: 'reports', path: '/reports', icon: FileText, labelKey: 'nav.reports' },
  { id: 'education', path: '/education', icon: GraduationCap, labelKey: 'nav.education' },
]
