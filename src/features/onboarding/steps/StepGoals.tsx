import { useTranslation } from 'react-i18next'
import { Check, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GOALS, destinationFor, destinationLabelKey } from '../goals'
import type { OnboardingData, UserGoal } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

interface GoalCardProps {
  selected: boolean
  onClick: () => void
  title: string
  desc: string
  icon: LucideIcon
}

/**
 * Eine Zielkarte – volle Breite, Symbol, Titel und ein Satz, was die Wahl
 * bewirkt.
 *
 * Vorher standen die Ziele als fünf kleine Chips nebeneinander, die je nach
 * Textlänge umbrachen. Sie sahen aus wie eine Nebensache, waren aber die
 * einzige Angabe, die die Reihenfolge von Messungen und Empfehlungen
 * verschiebt. Die Bauart ist bewusst dieselbe wie bei der Modus-Auswahl
 * (`Step0Mode`): Der Nutzer trifft hier dieselbe Art Entscheidung.
 *
 * `aria-pressed` statt `checkbox`: Es sind Umschalter, keine Formularfelder –
 * und Screenreader lesen den Zustand damit an der Karte selbst vor.
 */
function GoalCard({ selected, onClick, title, desc, icon: Icon }: GoalCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring w-full rounded-3xl p-4 text-left transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.985] ${
        selected
          ? 'bg-primary/[0.08] border border-primary shadow-[0_6px_24px_color-mix(in_srgb,var(--primary)_18%,transparent)]'
          : 'glass border border-transparent hover:bg-surface-2/60'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${
            selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
              {title}
            </p>
            <span
              aria-hidden="true"
              className={`ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
              }`}
            >
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-muted">{desc}</p>
        </div>
      </div>
    </button>
  )
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
    <div className="space-y-4">
      <p className="text-sm leading-snug text-muted">{t('onboarding.goals.subtitle')}</p>

      <div className="space-y-2.5">
        {GOALS.map((goal) => (
          <GoalCard
            key={goal.id}
            icon={goal.icon}
            title={t(`onboarding.step1.goalOptions.${goal.id}`)}
            desc={t(`onboarding.goals.desc.${goal.id}`)}
            selected={data.goals.includes(goal.id)}
            onClick={() => toggle(goal.id)}
          />
        ))}
      </div>

      {/* Die Auswahl beantwortet sich selbst: Wer ein Ziel antippt, sieht
          sofort, wo die App ihn danach hinbringt. Dasselbe Muster wie bei der
          PV- und der Warmwasser-Frage – eine Angabe, der man ihre Wirkung
          ansieht. Die Zeile steht auch ohne Auswahl da, sonst wirkte sie wie
          eine Belohnung fürs Antippen statt wie eine Auskunft. */}
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
