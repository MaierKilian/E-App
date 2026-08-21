import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Lightbulb, CheckCircle2, Home } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useTipsStore } from '@/store/tipsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore, resolvePrice, resolveEnergyContent } from '@/store/tariffStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { dueTypes } from '@/features/monitoring/due'
import { buildTips } from '@/features/tips/buildTips'
import type { OnboardingData } from '@/types'
import { ProgressRing } from './ProgressRing'
import { profileCompleteness, profileMissingCount } from './estimateEnergy'
import { buildHomeStage } from './homeStage'
import { HomeStage } from './HomeStage'
import { DueReadingBanner } from './DueReadingBanner'
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher'

interface HomeDashboardProps {
  data: OnboardingData
  onEdit: () => void
}

/**
 * Ultra-minimalistisches Zuhause-Dashboard.
 *
 * 1. Eine Karte vereint Begrüßung, Fortschritt und (nur solange nötig) den Aufruf
 *    zum Vervollständigen – der frühere große schwarze Button entfällt.
 * 2. Energie-Status: hochgerechnete Jahreskosten, aber nur mit echten Zählerständen.
 * 3. Personalisierte Empfehlungen.
 * 4. Wohnungs-Auswahl (schlank bei einer, als Raster ab zwei Wohnungen).
 * Bewusst ohne großen Profil-Block, damit alles ohne Scrollen auf einen Screen passt.
 */
export function HomeDashboard({ data, onEdit }: HomeDashboardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const results = useMeasurementsStore((s) => s.results)
  const doneIds = useTipsStore((s) => s.doneIds)
  const dismissedIds = useTipsStore((s) => s.dismissedIds)
  const readingsByType = useReadingsStore((s) => s.readings)
  const reminderFrequency = useReadingsStore((s) => s.reminderFrequency)
  const tariff = useTariffStore()

  // Die Bühne: Skala, Jahreszahl, Aufschlüsselung – wächst mit den Daten.
  const stage = buildHomeStage({
    profile: data,
    readingsByType,
    priceFor: (type) => {
      const meta = PRICE_META[type]
      return meta ? resolvePrice(tariff, type).work * meta.priceToEur : undefined
    },
    energyContentFor: (type) => resolveEnergyContent(tariff, type),
  })

  // Fällige Ablesung: die Logik gab es längst, der Startbildschirm nutzte sie nur nicht.
  // `now` einmal beim Mounten festhalten – wie in den Monitoring-Ansichten auch,
  // sonst wäre der Render nicht mehr idempotent.
  const [now] = useState(() => Date.now())
  const due = dueTypes(data, readingsByType, reminderFrequency, now)

  const completeness = profileCompleteness(data)
  const isComplete = completeness >= 100
  const missing = profileMissingCount(data)
  // Bei nur noch einer offenen Angabe ist ein grüner Aufruf-Knopf
  // unverhältnismäßig: die auffälligste Handlung des Startbildschirms wäre
  // dann Verwaltungsarbeit statt Nutzen. Ab hier nur noch ein leiser Hinweis.
  const almostComplete = !isComplete && missing <= 1
  // Auf dem Zuhause-Einstieg nur offene Empfehlungen zählen (erledigte/
  // ausgeblendete sind für den Nutzer bereits abgehakt).
  const tips = buildTips(data, results).filter(
    (tip) => !doneIds.includes(tip.id) && !dismissedIds.includes(tip.id),
  )

  return (
    <div className="space-y-4">
      {/* 1. Begrüßung + Fortschritt + Aufruf – eine Karte */}
      <div className="glass rounded-3xl p-4">
        <button
          type="button"
          onClick={onEdit}
          className="focus-ring w-full text-left rounded-2xl flex items-center gap-4 transition-transform duration-200 active:scale-[0.99]"
        >
          <div className="relative shrink-0">
            <ProgressRing value={completeness} size={64} stroke={6}>
              <Avatar src={data.profileImage || undefined} name={data.profileName} size={50} />
            </ProgressRing>
            {/* Haus-Badge kennzeichnet die Karte klar als Wohnung (nicht als Konto). */}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-surface-2">
              <Home className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('home.homeProfileLabel')}
            </p>
            <h1 className="text-xl font-bold text-foreground truncate">
              {(data.profileName ?? '').trim() || t('home.profileNameFallback')}
            </h1>
          </div>
          <ChevronRight className="w-5 h-5 text-muted shrink-0" />
        </button>

        {isComplete ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t('home.profileComplete')}
          </p>
        ) : almostComplete ? (
          <button
            type="button"
            onClick={onEdit}
            className="focus-ring mt-3 text-left text-sm text-muted transition-colors hover:text-foreground"
          >
            {t('home.profileMissing', { count: missing })}
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-muted">
              {t('home.profileMissing', { count: missing })}
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="focus-ring shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
            >
              {t('home.completeCta')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Die Bühne: Effizienz-Skala + Jahreszahl + Aufschlüsselung */}
      <HomeStage stage={stage} />

      {/* 3. Fällige Ablesung – der Grund, die App zu öffnen */}
      {due.length > 0 && <DueReadingBanner types={due} />}

      {/* 4. Personalisierte Empfehlungen (nur wenn vorhanden) */}
      {tips.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/tipps')}
          className="focus-ring glass w-full text-left rounded-3xl p-4 flex items-center gap-3 transition-transform active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{t('tips.entryTitle')}</p>
            <p className="text-xs text-muted">{t('tips.entryCount', { count: tips.length })}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted shrink-0" />
        </button>
      )}

      {/* 5. Wohnprofile: zwischen mehreren Wohnungen wechseln / neue anlegen */}
      <ProfileSwitcher />
    </div>
  )
}
