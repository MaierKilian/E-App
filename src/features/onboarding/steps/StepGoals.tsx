import { useTranslation } from 'react-i18next'
import { Check, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GOALS, destinationFor, destinationLabelKey } from '../goals'
import type { OnboardingData, UserGoal } from '@/types'

interface GoalRowProps {
  selected: boolean
  onClick: () => void
  title: string
  desc: string
  icon: LucideIcon
  /** Trennlinie nach oben – die Liste ist eine Gruppe, kein Kartenstapel. */
  divided: boolean
}

/**
 * Ein Ziel als Zeile: Symbol, Titel, eine Zeile Wirkung, Haken.
 *
 * **Warum keine Karten mehr.** Bis zum 05.09.2026 stand hier der Zuschnitt der
 * Modus-Auswahl (`Step0Mode`): volle Karte, großes Symbolfeld, eigener
 * Schlagschatten. Dort sind es **zwei** Karten für **eine** Entscheidung ganz
 * am Anfang – da trägt das Gewicht. Fünfmal für eine Mehrfachauswahl kopiert
 * kippte es: Nur dreieinhalb Optionen passten auf den Bildschirm, die Zeile
 * „Danach startest du hier" lag unter dem Fold, und fünf gleich laute Blöcke
 * ergaben keine Rangfolge, sondern einen Stapel.
 *
 * Der Haken sitzt in einem abgerundeten **Quadrat**, nicht in einem Kreis: Ein
 * Kreis ist die Konvention für „genau eine Wahl", und hier sind mehrere
 * möglich.
 *
 * `aria-pressed` statt `checkbox`: Es sind Umschalter, keine Formularfelder –
 * Screenreader lesen den Zustand damit an der Zeile selbst vor.
 */
function GoalRow({ selected, onClick, title, desc, icon: Icon, divided }: GoalRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
        divided ? 'border-t border-border/50' : ''
      } ${selected ? 'bg-primary/[0.07]' : 'hover:bg-surface-2/50'}`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-colors ${selected ? 'text-primary' : 'text-muted'}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}
        >
          {title}
        </span>
        {/* Eine Zeile, nicht drei: Der Satz nennt die Wirkung der Wahl, er
            erklärt sie nicht. */}
        <span className="mt-0.5 block text-xs leading-snug text-muted">{desc}</span>
      </span>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

/**
 * „Dein Ziel" – seit dem 05.09.2026 ein eigener Schritt.
 *
 * Die Frage stand am Fuß von „Dein Zuhause", unter Fläche, Personenzahl und
 * Baujahr, und nur im vollständigen Fragebogen. Beides passte nicht: Sie ist
 * keine Gebäudeangabe, und der Schnellstart zählte sie trotzdem als offene
 * Pflichtangabe – ein Schnellstart-Profil konnte 100 % nie erreichen.
 *
 * Seit sie eine eigene Seite hat, wird sie in **beiden** Wegen gestellt. Und
 * sie entscheidet jetzt sichtbar etwas: wo der Fragebogen einen ausspuckt.
 */
export function StepGoals({ data, onChange }: Props) {
  const { t } = useTranslation()

  function toggle(goal: UserGoal) {
    const next = data.goals.includes(goal)
      ? data.goals.filter((g) => g !== goal)
      : [...data.goals, goal]
    onChange({ goals: next })
  }

  const destination = destinationFor(data.goals)

  return (
    <div className="space-y-3">
      <p className="text-sm leading-snug text-muted">{t('onboarding.goals.subtitle')}</p>

      {/* „Mehrfachauswahl" als eigenes Label über der Liste. Vorher stand es
          als letzter Halbsatz eines dreizeiligen Fließtexts – dort hat es
          niemand gelesen, und die Kreise daneben behaupteten das Gegenteil. */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t('onboarding.goals.multiHint')}
      </p>

      {/* Eine Gruppe mit Trennlinien statt fünf schwebender Karten: Fünf
          Schlagschatten übereinander lesen sich als Stapel, nicht als Liste. */}
      <div className="glass overflow-hidden rounded-2xl">
        {GOALS.map((goal, i) => (
          <GoalRow
            key={goal.id}
            icon={goal.icon}
            title={t(`onboarding.step1.goalOptions.${goal.id}`)}
            desc={t(`onboarding.goals.desc.${goal.id}`)}
            selected={data.goals.includes(goal.id)}
            onClick={() => toggle(goal.id)}
            divided={i > 0}
          />
        ))}
      </div>

      {/* Die Auswahl beantwortet sich selbst: Wer ein Ziel antippt, sieht
          sofort, wo die App ihn danach hinbringt. Dasselbe Muster wie bei der
          PV- und der Warmwasser-Frage – eine Angabe, der man ihre Wirkung
          ansieht. Die Zeile steht auch ohne Auswahl da, sonst wirkte sie wie
          eine Belohnung fürs Antippen statt wie eine Auskunft. Seit die Liste
          kompakt ist, steht sie im sichtbaren Bereich statt unter dem Fold. */}
      <p
        aria-live="polite"
        className="flex items-center gap-2 rounded-2xl bg-surface-2/60 px-3.5 py-2.5 text-sm text-foreground"
      >
        <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span>
          {t('onboarding.goals.destination')}{' '}
          <span className="font-semibold">{t(destinationLabelKey(destination))}</span>
        </span>
      </p>
    </div>
  )
}
