import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, GraduationCap, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AccordionItem } from './Accordion'
import { PhotoPlaceholder } from './PhotoPlaceholder'
import { Quiz } from './Quiz'
import {
  FAQ,
  GLOSSARY,
  LAB_EXPERIMENTS,
  MEASUREMENT_INFOS,
  type LabExperiment,
} from './educationContent'

type Section = 'faq' | 'glossary' | 'measurements' | 'university'

const SECTIONS: Section[] = ['faq', 'glossary', 'measurements', 'university']

/** Schlanker Bereichs-Umschalter (segmented control). */
function SectionSwitch({
  section,
  onChange,
}: {
  section: Section
  onChange: (s: Section) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="glass flex gap-1 rounded-2xl p-1">
      {SECTIONS.map((s) => {
        const active = s === section
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-primary text-primary-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            {t(`education.sections.${s}`)}
          </button>
        )
      })}
    </div>
  )
}

function FaqView() {
  return (
    <div className="space-y-3">
      {FAQ.map((item) => (
        <AccordionItem key={item.q} title={item.q}>
          {item.a}
        </AccordionItem>
      ))}
    </div>
  )
}

function GlossaryView() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GLOSSARY
    return GLOSSARY.filter(
      (g) => g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="space-y-3">
      <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('education.glossarySearch')}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      {items.map((item) => (
        <AccordionItem key={item.term} title={item.term}>
          {item.def}
        </AccordionItem>
      ))}
    </div>
  )
}

function MeasurementsView() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      {MEASUREMENT_INFOS.map((info) => (
        <AccordionItem key={info.id} title={t(`measurements.${info.id}.title`, info.title)}>
          {info.body}
        </AccordionItem>
      ))}
    </div>
  )
}

function ExperimentDetail({
  experiment,
  onBack,
}: {
  experiment: LabExperiment
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [testing, setTesting] = useState(false)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={testing ? () => setTesting(false) : onBack}
        className="focus-ring flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('education.quiz.back')}
      </button>

      <div>
        <h2 className="text-xl font-bold">{experiment.title}</h2>
        <p className="mt-1 text-xs text-muted">{experiment.course}</p>
      </div>

      {testing ? (
        <Quiz experiment={experiment} onBack={() => setTesting(false)} />
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm leading-relaxed text-muted">{experiment.intro}</p>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {t('education.university.prepTitle')}
            </h3>
            <ul className="space-y-2.5">
              {experiment.prep.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>

          <PhotoPlaceholder count={experiment.photoCount} />

          <button
            type="button"
            onClick={() => setTesting(true)}
            className="focus-ring w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            {t('education.startTest')}
          </button>
        </div>
      )}
    </div>
  )
}

function UniversityView() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<LabExperiment | null>(null)

  if (selected) {
    return <ExperimentDetail experiment={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t('education.university.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('education.university.subtitle')}</p>
      </div>
      <div className="space-y-3">
        {LAB_EXPERIMENTS.map((exp) => (
          <button key={exp.id} type="button" onClick={() => setSelected(exp)} className="w-full text-left">
            <Card className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">{exp.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{exp.course}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Bildungsbereich „Wissen" mit FAQ, Glossar, Messungs-Infos und Hochschulteil. */
export function EducationPage() {
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('faq')

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t('pages.education.title')}</h1>
          <p className="mt-1 text-muted">{t('pages.education.subtitle')}</p>
        </div>
      </div>

      <SectionSwitch section={section} onChange={setSection} />

      {section === 'faq' && <FaqView />}
      {section === 'glossary' && <GlossaryView />}
      {section === 'measurements' && <MeasurementsView />}
      {section === 'university' && <UniversityView />}
    </div>
  )
}
