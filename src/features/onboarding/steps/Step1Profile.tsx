import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tag } from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { Slider } from '@/components/ui/Slider'
import { Field } from '@/components/ui/Field'
import { InfoButton } from '@/components/ui/InfoButton'
import { AvatarPicker } from '@/components/AvatarPicker'
import { PlausibilityNote } from '../PlausibilityNote'
import type { OnboardingData } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

/**
 * „Zuhause" – der erste Schritt beider Wege.
 *
 * Führt zusammen, was der Nutzer als eine Frage erlebt: Wer wohnt hier, wie
 * groß, in was für einem Gebäude. Vorher standen Personen und Wohnfläche in
 * zwei getrennten Schritten, obwohl die Plausibilitätsprüfung beide braucht und
 * niemand sie getrennt denkt.
 *
 * Die Ziele sind seit dem 05.09.2026 nicht mehr hier, sondern auf einer
 * eigenen Seite (`StepGoals`): Sie sind keine Gebäudeangabe, und als fünf
 * kleine Chips unter dem Baujahr sahen sie aus wie eine Nebensache. Gebäudeteil
 * und Etagenzahl sind ganz entfallen, Mieter/Eigentümer ebenso.
 */
export function Step1Profile({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()
  const [areaText, setAreaText] = useState(String(data.livingArea))

  function handleAreaBlur() {
    const parsed = Number.parseInt(areaText, 10)
    const clamped = Number.isFinite(parsed) ? Math.max(10, Math.min(1000, parsed)) : data.livingArea
    setAreaText(String(clamped))
    onChange({ livingArea: clamped })
  }

  return (
    <div className="space-y-6">
      {detailed && (
        <div className="pt-1">
          <AvatarPicker
            value={data.profileImage}
            name={data.profileName}
            onChange={(profileImage) => onChange({ profileImage })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Field title={t('onboarding.step1.profileName')} hint={t('onboarding.step1.profileNameHint')}>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={data.profileName}
              onChange={(e) => onChange({ profileName: e.target.value })}
              placeholder={t('onboarding.step1.profileNamePlaceholder')}
              className="focus-ring w-full rounded-2xl glass py-3 pl-10 pr-4 text-foreground placeholder:text-muted transition-colors"
            />
          </div>
        </Field>
      </div>

      <Field
        title={t('onboarding.step2.livingArea')}
        info={t('info.livingArea')}
        hint={t('onboarding.step2.livingAreaHint')}
      >
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={1000}
            value={areaText}
            onChange={(e) => {
              setAreaText(e.target.value)
              const parsed = Number.parseInt(e.target.value, 10)
              if (Number.isFinite(parsed)) onChange({ livingArea: parsed })
            }}
            onBlur={handleAreaBlur}
            className="focus-ring w-full rounded-2xl glass px-4 py-3 pr-12 text-foreground tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            m²
          </span>
        </div>
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {t('onboarding.step1.persons')}
            <InfoButton text={t('info.persons')} />
          </label>
          <Stepper
            value={data.personsCount}
            min={1}
            max={10}
            onChange={(v) => onChange({ personsCount: v })}
          />
        </div>
        <p className="text-xs text-muted">{t('onboarding.step1.personsHint')}</p>
      </div>

      {/* Die Zimmerzahl steht nur noch im Schnellstart. Der vollständige
          Fragebogen fragt zwei Schritte später ab, welche Räume es gibt – dort
          zweimal nach derselben Sache zu fragen, war die Redundanz, die Kilian
          am 05.09.2026 aufgefallen ist.

          Im Schnellstart gibt es diesen zweiten Schritt nicht (Abschnitt
          „rooms" ist `quick: false`). Dann ist die Zimmerzahl die einzige
          Größenangabe neben der Fläche und die Grundlage der
          Plausibilitätsprüfung „m² je Zimmer" (`effectiveRoomCount` in
          `plausibility.ts`). Sie hier ebenfalls zu streichen, hätte diese
          Prüfung für Schnellstart-Profile still abgeschaltet.

          Sobald doch Räume angelegt sind – etwa weil ein Schnellstart-Profil
          später ergänzt wurde –, ist die Liste die genauere Wahrheit und die
          Zeile verschwindet. */}
      {!detailed && data.rooms.length === 0 ? (
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-semibold text-foreground">
            {t('onboarding.step1.rooms')}
          </label>
          <Stepper
            value={data.roomsCount}
            min={1}
            max={20}
            onChange={(v) => onChange({ roomsCount: v })}
          />
        </div>
      ) : !detailed ? (
        <p className="text-xs text-muted">
          {t('onboarding.step1.roomsFromList', {
            count: data.rooms.reduce((sum, r) => sum + r.instances.length, 0),
          })}
        </p>
      ) : null}

      <Field
        title={t('onboarding.step2.buildingYear')}
        info={t('info.buildingYear')}
        hint={t('onboarding.step2.buildingYearHint')}
      >
        <Slider
          value={data.buildingYear}
          min={1850}
          max={2025}
          onChange={(v) => onChange({ buildingYear: v })}
        />
      </Field>

      {/* Der Abgleich steht unter den Werten, die er prüft. */}
      <PlausibilityNote data={data} />

    </div>
  )
}
