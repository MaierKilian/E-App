import { useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { RatingBadge } from '@/features/measurements/RatingBadge'
import { parseRoomKey, roomLabel } from '@/features/measurements/rooms'
import type { MeasurementResult } from '@/features/measurements/types'
import { measurementProgress, recentResults } from './measurementSummary'
import { resultValueText } from '@/features/measurements/resultValue'
import { useSkippedKeys } from '@/features/measurements/useSkipped'

/** Höchstens so viele der zuletzt gemessenen Ergebnisse werden überhaupt erwogen. */
const MAX_RECENT = 3

/**
 * Wie viele der zuletzt gemessenen Ergebnisse (bis zu `available`) angezeigt
 * werden, ohne dass der Zuhause-Screen scrollen muss: startet optimistisch bei
 * `available` und nimmt sich Eintrag für Eintrag zurück, solange die Seite
 * höher als der sichtbare Bereich ist – so bleiben die Wohnprofile am Ende der
 * Seite ohne Scrollen erreichbar. Läuft vor dem ersten Bildaufbau, damit
 * nichts sichtbar „springt". Nie unter 1, solange überhaupt ein Ergebnis da ist.
 */
function useFitRecentCount(available: number): number {
  // Bei geänderter Ergebnismenge (neue Messung, anderes Profil) wieder von
  // vorn probieren statt bei einem zu kleinen Stand von vorher zu bleiben –
  // direkt während des Renderns angepasst, ohne eigenen Effekt (React-Muster
  // „State beim Wechsel eines Werts zurücksetzen").
  const [prevAvailable, setPrevAvailable] = useState(available)
  const [count, setCount] = useState(available)
  if (available !== prevAvailable) {
    setPrevAvailable(available)
    setCount(available)
  }

  useLayoutEffect(() => {
    function fitToViewport() {
      if (count <= 1 || typeof window === 'undefined') return
      if (document.documentElement.scrollHeight > window.innerHeight) {
        setCount((c) => Math.max(1, c - 1))
      }
    }
    fitToViewport()
  })

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    function onResize() {
      setCount(available)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [available])

  return Math.min(count, available)
}

/**
 * Messungs-Karte auf dem Zuhause-Einstieg: Fortschritt und die zuletzt
 * erzielten Ergebnisse.
 *
 * Sie schließt eine Lücke, die die Empfehlungen prinzipiell nicht schließen
 * können: **Eine Messung ohne Befund erzeugt keine Empfehlung.** Wer seinen
 * Kühlschrank misst und ihn in Ordnung vorfindet, sah davon auf dem
 * Startbildschirm nichts – die Empfehlungsliste zeigt zwangsläufig nur die
 * Hälfte, bei der etwas nicht stimmt. Hier stehen die Ergebnisse selbst, gute
 * wie schlechte, und ein Tipp führt zur jeweiligen Messung zurück.
 *
 * Bewusst getrennt von den Empfehlungen: Ein Ergebnis ist ein Fakt und darf
 * nicht verschwinden, weil die zugehörige Maßnahme abgehakt oder ausgeblendet
 * wurde.
 */
export function MeasurementSummaryCard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const results = useMeasurementsStore((s) => s.results)
  const skipped = useSkippedKeys()
  const rooms = useOnboardingStore((s) => s.data.rooms)

  const { done, total } = measurementProgress(results, rooms, skipped)
  const recentAvailable = recentResults(results, MAX_RECENT)
  const visibleCount = useFitRecentCount(recentAvailable.length)
  const recent = recentAvailable.slice(0, visibleCount)

  /** Raumname eines Ergebnisses, wo der Schlüssel einen Raum bezeichnet. */
  function subLabel(r: MeasurementResult): string | undefined {
    if (!r.roomKey) return undefined
    // Nicht jeder Schlüssel ist ein Raum: Der Warmwasser-Check speichert dort
    // die Entnahmestelle. Ohne Treffer bleibt die Zeile einfach ohne Zusatz.
    const parsed = parseRoomKey(r.roomKey)
    if (!parsed) return undefined
    const total = rooms.find((room) => room.type === parsed.type)?.count ?? 1
    return roomLabel(t, { ...parsed, total: Math.max(1, total) })
  }

  return (
    <div className="glass rounded-3xl p-4">
      {/* Kopfzeile: Fortschritt + Sprung in die Messungen */}
      <button
        type="button"
        onClick={() => navigate('/measurements')}
        className="focus-ring flex w-full items-center gap-4 rounded-2xl text-left transition-transform active:scale-[0.99]"
      >
        <ProgressRing done={done} total={total} size={52} stroke={5} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('home.measurements.overline')}
          </p>
          <p className="font-semibold text-foreground">
            {recent.length > 0
              ? t('home.measurements.doneLine', { done, total })
              : t('home.measurements.emptyTitle')}
          </p>
          {recent.length === 0 && (
            <p className="mt-0.5 text-xs text-muted">{t('home.measurements.emptyHint')}</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </button>

      {recent.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {recent.map((r) => {
            const room = subLabel(r)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/measurements/${r.id}`)}
                  className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {t(`measurements.${r.id}.title`)}
                    </span>
                    {room && <span className="block truncate text-[11px] text-muted">{room}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {resultValueText(t, i18n.language, r)}
                  </span>
                  <RatingBadge rating={r.rating} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
