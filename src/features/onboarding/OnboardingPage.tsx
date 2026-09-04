import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Sparkles, Info } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { StepIndicator } from './StepIndicator'
import { ProfileHub } from './ProfileHub'
import {
  ONBOARDING_SECTIONS,
  sectionsFor,
  stateOf,
  type OnboardingSection,
  type SectionId,
} from './sections'
import { Step0Mode } from './steps/Step0Mode'
import { Step1Profile } from './steps/Step1Profile'
import { Step2Building } from './steps/Step2Building'
import { Step3Rooms } from './steps/Step3Rooms'
import { Step4Heating } from './steps/Step4Heating'
import { Step6Instruments } from './steps/Step6Instruments'
import { Step7Location } from './steps/Step7Location'
import { StepRenovationLog } from './steps/StepRenovationLog'
import { StepPrices } from './steps/StepPrices'
import { Step8Review } from './steps/Step8Review'
import { Card } from '@/components/ui/Card'
import { HomeDashboard } from '@/features/home/HomeDashboard'
import { PageHeader } from '@/components/ui/PageHeader'
import type { OnboardingData } from '@/types'
import { BottomBar } from '@/components/BottomBar'

interface StepContentProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  /** Vollständiger Fragebogen – die Schritte blenden dann mehr Felder ein. */
  detailed: boolean
}

/**
 * Was in einem Abschnitt gerendert wird, je Registry-id.
 *
 * Ersetzt die früheren zwei `switch`-Blöcke (Quick und Detailed), die dieselben
 * Schritte in zwei Reihenfolgen aufzählten. Welche Abschnitte ein Weg zeigt,
 * steht jetzt allein in `sections.ts`; hier steht nur noch, womit man sie füllt.
 * Über `SectionId` erzwingt der Compiler, dass kein Abschnitt ohne Inhalt
 * bleibt.
 */
const SECTION_BODIES: Record<SectionId, (p: StepContentProps) => ReactNode> = {
  home: ({ data, onChange, detailed }) => (
    <Step1Profile data={data} onChange={onChange} detailed={detailed} />
  ),
  rooms: ({ data, onChange }) => <Step3Rooms data={data} onChange={onChange} />,
  heating: ({ data, onChange, detailed }) => (
    <Step4Heating data={data} onChange={onChange} detailed={detailed} />
  ),
  prices: ({ data }) => <StepPrices data={data} />,
  // Hülle und Modernisierung in einem Schritt: Das Fensteralter und „Fenster
  // saniert" sind dieselbe Frage und standen vorher in zwei Schritten.
  building: ({ data, onChange }) => (
    <>
      <Step2Building data={data} onChange={onChange} />
      <div className="mt-6 border-t border-border pt-6">
        <StepRenovationLog data={data} />
      </div>
    </>
  ),
  equipment: ({ data, onChange, detailed }) => (
    <Step6Instruments data={data} onChange={onChange} detailed={detailed} />
  ),
  location: ({ data, onChange }) => <Step7Location data={data} onChange={onChange} />,
  review: ({ data }) => <Step8Review data={data} />,
}

/**
 * Rendert einen Abschnitt und merkt sich, dass er gesehen wurde.
 *
 * Der Besuch wird beim Rendern vermerkt, nicht beim Verlassen: Sonst zählte ein
 * Zurück-Wischen nicht als Besuch, und der Schritt bliebe „offen“, obwohl der
 * Nutzer ihn vor sich hatte.
 */
function SectionBody({
  section,
  data,
  onChange,
  detailed,
}: {
  section: OnboardingSection
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed: boolean
}) {
  const markVisited = useOnboardingStore((s) => s.markVisited)
  useEffect(() => {
    markVisited(section.id)
  }, [section.id, markVisited])

  return <>{SECTION_BODIES[section.id]({ data, onChange, detailed })}</>
}

/**
 * Fest fixierte Aktionsleiste am unteren Bildschirmrand (Glass-Stil).
 * Liegt oberhalb der mobilen BottomNav und enthält Zurück / Weiter bzw. Speichern.
 */
function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <BottomBar>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">{children}</div>
    </BottomBar>
  )
}

const PRIMARY_BTN =
  'flex items-center justify-center gap-1 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]'
const SECONDARY_BTN =
  'flex items-center justify-center gap-1 px-5 py-3 rounded-2xl border border-border bg-surface/70 text-foreground text-sm font-medium transition-[transform,colors] hover:bg-surface-2 active:scale-[0.97]'

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, currentStep, flowMode, editReturnTo, visitedSections, setStep, updateData, complete, editProfile, clearReturnTo } =
    useOnboardingStore()

  // Step -1 = mode selection (Step0Mode), steps >= 0 = actual flow steps
  const isOnModeSelection = currentStep === -1
  const mode = data.mode

  // Die Schritte des gewählten Wegs – die einzige Stelle, an der die
  // Reihenfolge herkommt (siehe `sections.ts`).
  const flowSections = sectionsFor(mode)
  const totalSteps = flowSections.length
  const isLastStep = !isOnModeSelection && currentStep === totalSteps - 1
  // Ein gespeicherter Schritt kann nach einem App-Update aus dem gültigen
  // Bereich fallen – Etappe 4 kürzte den Schnellstart z. B. von 6 auf 3
  // Schritte. Unkorrigiert blieb der Inhaltsbereich dauerhaft leer (Kopf- und
  // Navigationsleiste standen weiter, `activeSection` war undefined und die
  // Seite gab `null` zurück) – ein Sackgassen-Zustand, aus dem nur Browserdaten
  // löschen herausführte.
  const safeStep = totalSteps > 0 ? Math.min(Math.max(currentStep, 0), totalSteps - 1) : 0
  const activeSection = flowSections[safeStep]
  // Der Review-Schritt bringt eigene Karten mit – kein zusätzlicher Card-Rahmen.
  const isReviewStep = Boolean(activeSection?.review)

  useEffect(() => {
    if (!isOnModeSelection && flowMode === 'linear' && currentStep !== safeStep) {
      setStep(safeStep)
    }
  }, [isOnModeSelection, flowMode, currentStep, safeStep, setStep])

  if (data.completed) {
    return <HomeDashboard data={data} onEdit={editProfile} />
  }

  // Bearbeitungsmodus: Profil-Hub (currentStep -2) bzw. einzelner Abschnitt (>= 0).
  // Im Bearbeitungsmodus zählen immer die Indizes der vollständigen Liste –
  // auch für Schnellstart-Profile, die dort alle Abschnitte nachtragen können.
  if (flowMode === 'edit') {
    const editSectionDef = ONBOARDING_SECTIONS[currentStep]
    if (currentStep === -2 || !editSectionDef) {
      return (
        <div className="pb-24">
          <ProfileHub data={data} onOpenSection={setStep} onDone={complete} />
        </div>
      )
    }

    return (
      <div className="pb-24">
        <PageHeader
          title={t(editSectionDef.titleKey)}
          back={{
            label: t('onboarding.hub.backToOverview'),
            onClick: () => { clearReturnTo(); setStep(-2) },
          }}
        />

        <div key={`edit-${currentStep}`} className="animate-step-in mt-5">
          <Card>
            <SectionBody section={editSectionDef} data={data} onChange={updateData} detailed />
          </Card>
        </div>

        <ActionBar>
          <button
            type="button"
            onClick={() => {
              if (editReturnTo) {
                const returnPath = editReturnTo
                clearReturnTo()
                navigate(returnPath)
              } else {
                setStep(-2)
              }
            }}
            className={`${PRIMARY_BTN} w-full`}
          >
            {t('onboarding.hub.done')}
          </button>
        </ActionBar>
      </div>
    )
  }

  function handleBack() {
    if (isOnModeSelection) return
    if (currentStep === 0) {
      setStep(-1)
    } else {
      setStep(currentStep - 1)
    }
  }

  function handleNext() {
    if (isOnModeSelection) {
      setStep(0)
      return
    }
    if (currentStep < totalSteps - 1) {
      setStep(currentStep + 1)
    }
  }

  function handleSave() {
    complete()
    navigate('/measurements')
  }

  // Mode-Auswahl: eigener Screen mit eigener Aktionsleiste.
  if (isOnModeSelection) {
    return (
      <div className="pb-24">
        <div
          key="mode"
          className="animate-step-in flex min-h-[calc(100dvh-15rem)] flex-col justify-center"
        >
          <div className="mb-6">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t('onboarding.step0.title')}</h2>
            <p className="mt-1 text-sm text-muted">{t('onboarding.step0.subtitle')}</p>
          </div>

          <Step0Mode data={data} onChange={updateData} />

          <p className="mt-5 flex items-center gap-1.5 px-1 text-xs text-muted">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('onboarding.step0.note')}
          </p>
        </div>

        <ActionBar>
          <button type="button" onClick={handleNext} className={`${PRIMARY_BTN} w-full`}>
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </ActionBar>
      </div>
    )
  }

  if (!activeSection) return null

  const body = (
    <SectionBody
      section={activeSection}
      data={data}
      onChange={updateData}
      detailed={mode === 'detailed'}
    />
  )

  return (
    <div className="pb-24">
      <StepIndicator
        currentStep={safeStep}
        title={t(activeSection.titleKey)}
        states={flowSections.map((s) => stateOf(s, data, visitedSections))}
      />

      <div key={`${mode}-${safeStep}`} className="animate-step-in mt-5">
        {isReviewStep ? body : <Card>{body}</Card>}
      </div>

      <ActionBar>
        <button type="button" onClick={handleBack} className={SECONDARY_BTN}>
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        {isLastStep ? (
          <button type="button" onClick={handleSave} className={`${PRIMARY_BTN} flex-1`}>
            {t('common.save')}
          </button>
        ) : (
          <button type="button" onClick={handleNext} className={`${PRIMARY_BTN} flex-1`}>
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </ActionBar>
    </div>
  )
}
