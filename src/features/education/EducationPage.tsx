import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, ChevronRight, Search, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useProgressStore } from '@/store/progressStore'
import { AccordionItem } from './Accordion'
import { PhotoPlaceholder } from './PhotoPlaceholder'
import { Quiz } from './Quiz'
import { FlashcardsView } from './flashcards/FlashcardsView'
import {
  FAQ,
  GLOSSARY,
  LAB_EXPERIMENTS,
  MEASUREMENT_INFOS,
  type LabExperiment,
} from './educationContent'

type Section = 'faq' | 'glossary' | 'measurements' | 'university' | 'flashcards'

/** Oberste Ebene: allgemeines Energiewissen vs. HTW-GEIT-Studieninhalte. */
type Group = 'general' | 'university'

const GROUPS: Group[] = ['general', 'university']

/** Welche Unterpunkte zu welcher Gruppe gehören. */
const GROUP_SECTIONS: Record<Group, Section[]> = {
  general: ['faq', 'glossary', 'measurements'],
  university: ['university', 'flashcards'],
}

/** Ebene 1: schlichter 2er-Umschalter zwischen den Gruppen. */
function GroupSwitch({ group, onChange }: { group: Group; onChange: (g: Group) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2">
      {GROUPS.map((g) => {
        const active = g === group
        return (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            aria-pressed={active}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'glass text-foreground hover:bg-surface-2/70'
            }`}
          >
            {t(`education.groups.${g}`)}
          </button>
        )
      })}
    </div>
  )
}

/** Ebene 2: horizontal scrollbare Themen-Chips der aktuellen Gruppe. */
function SectionSwitch({
  sections,
  section,
  onChange,
}: {
  sections: Section[]
  section: Section
  onChange: (s: Section) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {sections.map((s) => {
        const active = s === section
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
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

/** Karte eines Laborversuchs mit Dauer, Schwierigkeit und Test-Status. */
function ExperimentCard({
  exp,
  onSelect,
}: {
  exp: LabExperiment
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const record = useProgressStore((s) => s.quizResults[exp.id])
  const passed = record?.passed

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="block truncate text-sm font-semibold">{exp.title}</span>
            {passed && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                {t('education.university.passed')}
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span>{exp.durationMin} {t('measurements.minutesUnit')}</span>
            <span aria-hidden>·</span>
            <span>{t(`education.difficulty.${exp.difficulty}`)}</span>
            <span aria-hidden>·</span>
            <span>{exp.quiz.length} {t('education.quiz.question')}n</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Card>
    </button>
  )
}

/** Laborversuche mit Vorbereitungstest (Hochschulteil). */
function UniversityView() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<LabExperiment | null>(null)

  if (selected) {
    return <ExperimentDetail experiment={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('education.university.subtitle')}</p>
      {LAB_EXPERIMENTS.map((exp) => (
        <ExperimentCard key={exp.id} exp={exp} onSelect={() => setSelected(exp)} />
      ))}
    </div>
  )
}

/** Bildungsbereich „Wissen" mit FAQ, Glossar, Messungs-Infos und Hochschulteil. */
export function EducationPage() {
  const { t } = useTranslation()
  const [group, setGroup] = useState<Group>('general')
  const [section, setSection] = useState<Section>('faq')

  // Gruppenwechsel: auf den ersten Unterpunkt der neuen Gruppe springen.
  const selectGroup = (g: Group) => {
    setGroup(g)
    setSection(GROUP_SECTIONS[g][0])
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('pages.education.title')}
        subtitle={t('pages.education.subtitle')}
      />

      <GroupSwitch group={group} onChange={selectGroup} />
      <SectionSwitch sections={GROUP_SECTIONS[group]} section={section} onChange={setSection} />

      {section === 'faq' && <FaqView />}
      {section === 'glossary' && <GlossaryView />}
      {section === 'measurements' && <MeasurementsView />}
      {section === 'university' && <UniversityView />}
      {section === 'flashcards' && <FlashcardsView />}
    </div>
  )
}
