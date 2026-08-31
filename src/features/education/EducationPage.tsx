import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, ChevronRight, GraduationCap, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useProgressStore } from '@/store/progressStore'
import { PhotoPlaceholder } from './PhotoPlaceholder'
import { Quiz } from './Quiz'
import { FlashcardsView } from './flashcards/FlashcardsView'
import { LookupList, LookupRow } from './lookup/LookupList'
import { SearchField } from './lookup/SearchField'
import { NoResults } from './lookup/NoResults'
import { FilterChips } from './lookup/FilterChips'
import { groupByTopic } from './lookup/topics'
import type { Topic } from './lookup/topics'
import { searchPreview, teaserOf } from './lookup/search'
import { useLookup } from './lookup/useLookup'
import type { Source } from './educationContent'
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

/** Welche Unterpunkte zu welcher Gruppe gehören. */
const GROUP_SECTIONS: Record<Group, Section[]> = {
  general: ['faq', 'glossary', 'measurements'],
  university: ['university', 'flashcards'],
}

/** Horizontal scrollbare Themen-Chips der aktuellen Gruppe. */
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
    <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1">
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

/**
 * Rechtsbündiger Icon-Button zum HTW-GEIT-Bereich. Ersetzt den früheren, gleich
 * breiten 2er-Umschalter: der Hochschulteil ist ein Nebenpfad, kein
 * gleichwertiger zweiter Hauptbereich, und wird perspektivisch entfernt – ein
 * dezenter Zugang statt zweier prominenter Buttons trägt das schon heute.
 */
function UniversityToggle({ group, onToggle }: { group: Group; onToggle: () => void }) {
  const { t } = useTranslation()
  const active = group === 'university'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={t('education.groups.university')}
      title={t('education.groups.university')}
      className={`focus-ring shrink-0 rounded-full p-2.5 transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'glass text-muted hover:text-foreground'
      }`}
    >
      <GraduationCap className="h-4 w-4" />
    </button>
  )
}

/**
 * Anklickbare Quellenangabe (öffnet im neuen Tab).
 *
 * Der Stand steht bewusst **neben** dem Link und nicht darin: Er gehört zur
 * Angabe im Text, nicht zur verlinkten Seite – die ändert sich weiter.
 */
function SourceLink({ source }: { source?: Source }) {
  const { t } = useTranslation()
  if (!source) return null
  return (
    <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {t('education.source')}: {source.label}
        <ExternalLink aria-hidden className="h-3 w-3 shrink-0" />
      </a>
      {source.stand && (
        <span className="text-xs text-muted">{t('education.stand', { stand: source.stand })}</span>
      )}
    </span>
  )
}

/** Suchfeld und Themenfilter – in allen drei Ansichten identisch aufgebaut. */
function LookupControls({
  placeholder,
  lookup,
}: {
  placeholder: string
  lookup: ReturnType<typeof useLookup<{ topic?: Topic }>>
}) {
  return (
    <>
      <SearchField
        value={lookup.query}
        onChange={lookup.setQuery}
        placeholder={placeholder}
        resultCount={lookup.filtered.length}
      />
      <FilterChips topics={lookup.topics} active={lookup.topic} onChange={lookup.setTopic} />
    </>
  )
}

/** Überschrift über einem Abschnitt der Liste. */
function ListHeading({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h2>
  )
}

/**
 * Wenn die Seite mit `#faq-<id>` aufgerufen wird, die gemeinte Frage
 * aufklappen und anspringen.
 *
 * Der Anker wird **einmal beim Aufbau** gelesen und danach nicht mehr: Klappt
 * der Nutzer anschließend andere Fragen auf, soll sich die Seite nicht wieder
 * auf den Anker zurückziehen.
 */
function useFaqAnchor(): string {
  const [id] = useState(() =>
    typeof window === 'undefined' ? '' : decodeURIComponent(window.location.hash).replace(/^#faq-/, ''),
  )
  useEffect(() => {
    if (!id) return
    document.getElementById(`faq-${id}`)?.scrollIntoView({ block: 'center' })
  }, [id])
  return id
}

function FaqView() {
  const { t } = useTranslation()
  const lookup = useLookup(FAQ, (item) => [item.q, item.a])
  const anchor = useFaqAnchor()

  const row = (item: (typeof FAQ)[number]) => (
    <LookupRow
      key={item.id}
      anchorId={`faq-${item.id}`}
      defaultOpen={item.id === anchor}
      title={item.q}
      teaser={searchPreview(item.q, teaserOf(item, item.a), item.a, lookup.query)}
      query={lookup.query}
    >
      <p>{item.a}</p>
      <SourceLink source={item.source} />
    </LookupRow>
  )

  // „Beliebte Fragen" stehen oben; die Themenblöcke darunter listen bewusst nur
  // den Rest – eine zweite Kopie wäre reine Wiederholung.
  const popular = lookup.filtered.filter((item) => item.popular)
  const groups = groupByTopic(lookup.filtered.filter((item) => !item.popular))

  return (
    <div className="space-y-4">
      <LookupControls placeholder={t('education.faqSearch')} lookup={lookup} />

      {lookup.filtered.length === 0 ? (
        <LookupList>
          <NoResults query={lookup.query} onReset={lookup.reset} />
        </LookupList>
      ) : lookup.narrowed ? (
        // Eingeschränkte Liste: ein Block. Nach Themen zu gliedern, wenn gerade
        // nach einem Thema gefiltert wird, ergäbe genau eine Überschrift.
        <LookupList>{lookup.filtered.map(row)}</LookupList>
      ) : (
        <>
          {popular.length > 0 && (
            <div className="space-y-2">
              <ListHeading>{t('education.faqPopular')}</ListHeading>
              <LookupList>{popular.map(row)}</LookupList>
            </div>
          )}
          {groups.map((group) => (
            <div key={group.topic ?? 'rest'} className="space-y-2">
              <ListHeading>
                {group.topic ? t(`education.topics.${group.topic}`) : t('education.faqAll')}
              </ListHeading>
              <LookupList>{group.items.map(row)}</LookupList>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function GlossaryView() {
  const { t } = useTranslation()
  const lookup = useLookup(GLOSSARY, (item) => [item.term, item.def])

  return (
    <div className="space-y-4">
      <LookupControls placeholder={t('education.glossarySearch')} lookup={lookup} />
      <LookupList>
        {lookup.filtered.length === 0 ? (
          <NoResults query={lookup.query} onReset={lookup.reset} />
        ) : (
          lookup.filtered.map((item) => (
            <LookupRow
              key={item.term}
              title={item.term}
              meta={item.unit}
              teaser={searchPreview(item.term, teaserOf(item, item.def), item.def, lookup.query)}
              query={lookup.query}
            >
              <p>{item.def}</p>
              <SourceLink source={item.source} />
            </LookupRow>
          ))
        )}
      </LookupList>
    </div>
  )
}

function MeasurementsView() {
  const { t } = useTranslation()
  // Titel über i18n, damit die Suche findet, was auch auf dem Schirm steht.
  const titleOf = (info: (typeof MEASUREMENT_INFOS)[number]) =>
    t(`measurements.${info.id}.title`, info.title)
  const lookup = useLookup(MEASUREMENT_INFOS, (info) => [titleOf(info), info.body])

  return (
    <div className="space-y-4">
      <LookupControls placeholder={t('education.measurementsSearch')} lookup={lookup} />
      <LookupList>
        {lookup.filtered.length === 0 ? (
          <NoResults query={lookup.query} onReset={lookup.reset} />
        ) : (
          lookup.filtered.map((info) => (
            <LookupRow
              key={info.id}
              title={titleOf(info)}
              teaser={searchPreview(
                titleOf(info),
                teaserOf(info, info.body),
                info.body,
                lookup.query,
              )}
              query={lookup.query}
            >
              <p>{info.body}</p>
              <SourceLink source={info.source} />
            </LookupRow>
          ))
        )}
      </LookupList>
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

      <div className="flex items-center gap-2">
        <SectionSwitch sections={GROUP_SECTIONS[group]} section={section} onChange={setSection} />
        <UniversityToggle
          group={group}
          onToggle={() => selectGroup(group === 'university' ? 'general' : 'university')}
        />
      </div>

      {section === 'faq' && <FaqView />}
      {section === 'glossary' && <GlossaryView />}
      {section === 'measurements' && <MeasurementsView />}
      {section === 'university' && <UniversityView />}
      {section === 'flashcards' && <FlashcardsView />}
    </div>
  )
}
