import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  Ruler,
  ClipboardList,
  Wallet,
  LineChart,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useMeasurementDraftStore } from '@/store/measurementDraftStore'

/** Setzt alle Nutzerdaten zurück (App-Einstellungen wie Theme/Sprache bleiben). */
function resetAllUserData() {
  useOnboardingStore.getState().reset()
  useMeasurementsStore.getState().resetAll()
  useReadingsStore.getState().resetReadings()
  useTariffStore.getState().resetTariff()
  useProgressStore.getState().resetProgress()
  useMeasurementDraftStore.getState().resetDrafts()
  // Einführung wieder anzeigen (wie ein frischer Start).
  useSettingsStore.getState().setIntroSeen(false)
  // Demo-Modus (Beispiel-Wohnung) beenden.
  useSettingsStore.getState().setDemoMode(false)
}

/** Karte für einen einzelnen Reset mit zweistufiger Inline-Bestätigung. */
function ResetCard({
  icon: Icon,
  title,
  desc,
  onReset,
  danger,
}: {
  icon: LucideIcon
  title: string
  desc: string
  onReset: () => void
  danger?: boolean
}) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  function doReset() {
    onReset()
    setConfirm(false)
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  const accent = danger ? 'text-rose-600' : 'text-primary'
  const accentBg = danger ? 'bg-rose-500/10' : 'bg-primary/10'

  return (
    <div
      className={`glass rounded-2xl p-4 ${danger ? 'border border-rose-500/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accentBg} ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{desc}</p>
        </div>
      </div>

      <div className="mt-3">
        {done ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            {t('settings.data.done')}
          </span>
        ) : confirm ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2/40 p-2.5 sm:flex-row sm:items-center">
            <p className="flex-1 text-xs text-muted">{t('settings.data.confirmQuestion')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                {t('settings.data.cancel')}
              </button>
              <button
                type="button"
                onClick={doReset}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('settings.data.confirmYes')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              danger
                ? 'bg-rose-600 text-white hover:opacity-90'
                : 'border border-border bg-surface text-foreground hover:bg-surface-2'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            {t('settings.data.reset')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Seite zum Zurücksetzen einzelner Datenbereiche oder aller Nutzerdaten. */
export function DataResetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <div>
        <h1 className="text-2xl font-bold">{t('settings.data.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('settings.data.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <ResetCard
          icon={ClipboardList}
          title={t('settings.data.profile.title')}
          desc={t('settings.data.profile.desc')}
          onReset={() => useOnboardingStore.getState().reset()}
        />
        <ResetCard
          icon={Ruler}
          title={t('settings.data.measurements.title')}
          desc={t('settings.data.measurements.desc')}
          onReset={() => useMeasurementsStore.getState().resetAll()}
        />
        <ResetCard
          icon={Wallet}
          title={t('settings.data.tariff.title')}
          desc={t('settings.data.tariff.desc')}
          onReset={() => useTariffStore.getState().resetTariff()}
        />
        <ResetCard
          icon={LineChart}
          title={t('settings.data.readings.title')}
          desc={t('settings.data.readings.desc')}
          onReset={() => useReadingsStore.getState().resetReadings()}
        />
      </div>

      <div className="pt-1">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t('settings.data.dangerZone')}
        </p>
        <ResetCard
          icon={Trash2}
          title={t('settings.data.all.title')}
          desc={t('settings.data.all.desc')}
          danger
          onReset={() => {
            resetAllUserData()
            navigate('/onboarding')
          }}
        />
      </div>
    </div>
  )
}
