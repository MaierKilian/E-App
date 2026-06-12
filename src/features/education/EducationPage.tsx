import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, GraduationCap, Search, ExternalLink } from 'lucide-react'
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

/** Horizontal scrollbare Themen-Chips (statt gequetschter 4er-Segmentleiste). */
function SectionSwitch({
  section,
  onChange,
}: {
  section: Section
  onChange: (s: Section) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {SECTIONS.map((s) => {
        const active = s === section
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'glass text-foreground hover:bg-surface-2/70'
            }`}
          >
            {t(`education.sections.${s}`)}
          </button>
        )
      })}
    </div>
  )
}

/** Anklickbare Quellenangabe (öffnet im neuen Tab). */
function SourceLink({ source }: { source?: { label: string; url: string } }) {
  const { t } = useTranslation()
  if (!source) return null
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {t('education.source')}: {source.label}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}

function FaqView() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return FAQ
    return FAQ.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
    )
  }, [q])

  const popular = FAQ.filter((item) => item.popular)
  const searching = q.length > 0

  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('education.faqSearch')}
          aria-label={t('education.faqSearch')}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      {searching ? (
        filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((item) => (
              <AccordionItem key={item.q} title={item.q}>
                <p>{item.a}</p>
                <SourceLink source={item.source} />
              </AccordionItem>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">{t('education.faqNoResults')}</p>
        )
      ) : (
        <>
          {popular.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {t('education.faqPopular')}
              </h2>
              {popular.map((item) => (
                <AccordionItem key={item.q} title={item.q}>
                  <p>{item.a}</p>
                  <SourceLink source={item.source} />
                </AccordionItem>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {t('education.faqAll')}
            </h2>
            {FAQ.map((item) => (
              <AccordionItem key={item.q} title={item.q}>
                <p>{item.a}</p>
                <SourceLink source={item.source} />
              </AccordionItem>
            ))}
          </div>
        </>
      )}
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
          <p>{item.def}</p>
          <SourceLink source={item.source} />
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
          <p>{info.body}</p>
          <SourceLink source={info.source} />
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
  // Name wird bewusst VOR dem Test erfragt (nicht erst am Ende).
  const [name, setName] = useState('')

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
        <Quiz
          experiment={experiment}
          name={name}
          onName={setName}
          onBack={() => setTesting(false)}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm leading-relaxed text-foreground">{experiment.intro}</p>
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

          <PhotoPlaceholder photos={experiment.photos} alt={experiment.title} />

          <Card>
            <label
              htmlFor="quiz-name"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              {t('education.quiz.nameLabel')}
            </label>
            <input
              id="quiz-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('education.quiz.namePlaceholder')}
              className="focus-ring w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted"
            />
          </Card>

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
