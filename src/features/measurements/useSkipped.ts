import { useMemo } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { skippedMeasurements } from '@/features/onboarding/appliances'

/**
 * Alle Schlüssel, die aus der Fortschrittszählung fallen – Räume wie Checks.
 *
 * Zwei Quellen, ein Ergebnis: die im Messungen-Bereich ausgenommenen Räume aus
 * dem Store und die Checks, die das Profil ausschließt („wir haben kein
 * Gefriergerät"). Der zweite Teil wird bewusst **abgeleitet** statt beim
 * Antworten in den Store geschrieben – sonst gäbe es zwei Kopien derselben
 * Aussage, und wer im Profil-Hub doch ein Gerät einträgt, bliebe an einer
 * vergessenen Skip-Zeile hängen.
 *
 * Weil jede Fortschrittsstelle über diesen Haken geht, zeigen Ring, Kacheln und
 * Zuhause-Karte zwangsläufig dieselbe Zahl.
 */
export function useSkippedKeys(): string[] {
  const stored = useMeasurementsStore((s) => s.skipped)
  const appliances = useOnboardingStore((s) => s.data.appliances)
  const answered = useOnboardingStore((s) => s.data.appliancesAnswered)
  return useMemo(
    () => [...stored, ...skippedMeasurements({ appliances, appliancesAnswered: answered })],
    [stored, appliances, answered],
  )
}
