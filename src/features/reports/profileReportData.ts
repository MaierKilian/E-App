import type { TFunction } from 'i18next'
import type { OnboardingData, RenovationEvent } from '@/types'

/**
 * Der Haushalts-Steckbrief: was der Bericht über das Objekt selbst sagt.
 *
 * **Warum es ihn gibt.** Der Bericht kannte vom Profil genau zwei Felder –
 * den Namen und die Räume. Ein Energieberater, dem man das PDF hinlegt, erfuhr
 * also, wie die Wohnung heißt, aber nicht, wie alt das Haus ist, womit geheizt
 * wird oder wann zuletzt saniert wurde. Ohne das sind die Messwerte darunter
 * nicht einzuordnen.
 *
 * Bewusst getrennt vom Zeichnen: Was im Steckbrief steht, lässt sich so ohne
 * PDF-Renderer prüfen (`tests/unit/profileReport.test.ts`).
 */

/** Ein Wertepaar. `value === null` heißt „nicht angegeben". */
export type ProfileRow = [label: string, value: string | null]

export interface ProfileBlock {
  title: string
  rows: ProfileRow[]
}

/**
 * Eine fehlende Angabe wird benannt, nicht verschwiegen.
 *
 * Ein Bericht, der die Lücke einfach weglässt, verleitet dazu, die Zahlen für
 * vollständig zu halten – gerade weil der Empfänger das Profil nicht kennt.
 */
export function fmtRow(t: TFunction, value: string | null): string {
  return value ?? t('report.pdf.profile.missing')
}

/**
 * Nur die ersten beiden Stellen der Postleitzahl.
 *
 * Die volle PLZ macht den Bericht zusammen mit Wohnfläche und Baujahr gut
 * identifizierbar. Für die regionale Einordnung, um die es hier geht, genügen
 * zwei Stellen.
 */
export function coarsePostalCode(postalCode: string): string | null {
  const digits = postalCode.replace(/\D/g, '')
  return digits.length >= 2 ? `${digits.slice(0, 2)}___` : null
}

/** Leerer String, 0 oder leere Liste zählen als „nicht angegeben". */
function value(text: string | undefined | null): string | null {
  const trimmed = text?.trim()
  return trimmed ? trimmed : null
}

function list(items: string[]): string | null {
  return items.length > 0 ? items.join(', ') : null
}

/**
 * Jahreszahl, ohne Tausendertrennzeichen.
 *
 * `Intl.NumberFormat` macht aus 2005 ein "2.005" - bei einer Menge richtig,
 * bei einem Jahr falsch.
 */
function year(n: number | undefined): string | null {
  return Number.isFinite(n) && (n ?? 0) > 0 ? String(n) : null
}

/** Zahl mit Einheit; 0 und Unsinniges gelten als nicht angegeben. */
function quantity(n: number | undefined, unit: string, language: string): string | null {
  if (!Number.isFinite(n) || (n ?? 0) <= 0) return null
  return `${new Intl.NumberFormat(language).format(n as number)} ${unit}`.trim()
}

function yesNo(t: TFunction, on: boolean): string {
  return on ? t('report.pdf.profile.yes') : t('report.pdf.profile.no')
}

/** `'unknown'` ist keine Antwort – für eine nicht mehr gestellte Frage erst recht nicht. */
function known(v: string | null | undefined): string | null {
  return v && v !== 'unknown' ? v : null
}

/** Behält nur die Zeilen einer abgeschafften Frage, die tatsächlich einen Wert tragen. */
function retired(rows: ProfileRow[]): ProfileRow[] {
  return rows.filter(([, v]) => v !== null)
}

export function buildProfileReportData(
  data: OnboardingData,
  t: TFunction,
  language: string,
): ProfileBlock[] {
  const opt = (group: string, key: string | null | undefined): string | null =>
    key ? value(t(`${group}.${key}`)) : null

  const building: ProfileRow[] = [
    [t('onboarding.step8.labels.buildingType'), opt('onboarding.step2', data.buildingType)],
    [t('onboarding.step8.labels.buildingYear'), year(data.buildingYear)],
    [t('onboarding.step8.labels.livingArea'), quantity(data.livingArea, 'm²', language)],
    [t('onboarding.step8.labels.floors'), quantity(data.floors, '', language)],
    // Dämmzustand, Fensteralter und Lüftung werden seit dem Wegfall des
    // Schritts „Gebäudehülle & Modernisierung" nicht mehr erhoben. Sie stehen
    // weiter im Steckbrief, wenn ein Bestandsprofil sie trägt – aber nicht
    // mehr als Zeile „nicht angegeben": Das läse sich wie eine Lücke, die der
    // Nutzer schließen könnte, und genau das kann er nicht mehr.
    ...retired([
      [
        t('onboarding.step8.labels.insulationState'),
        opt('onboarding.step5.insulationOptions', known(data.insulationState)),
      ],
      [
        t('onboarding.step8.labels.windowAge'),
        opt('onboarding.step2.windowAgeOptions', known(data.windowAge)),
      ],
      [
        t('onboarding.step8.labels.ventilationType'),
        opt('onboarding.step5.ventilationOptions', known(data.ventilationType)),
      ],
    ]),
  ]

  const household: ProfileRow[] = [
    [t('onboarding.step8.labels.persons'), quantity(data.personsCount, '', language)],
    [
      t('report.pdf.profile.rooms'),
      list(
        data.rooms.map(
          (r) => `${t(`onboarding.step3.roomTypes.${r.type}`)}${r.count > 1 ? ` ×${r.count}` : ''}`,
        ),
      ),
    ],
    [
      t('onboarding.step8.labels.occupancyStatus'),
      opt('onboarding.step1.occupancyOptions', data.occupancyStatus),
    ],
    [t('onboarding.step8.labels.postalCode'), coarsePostalCode(data.postalCode)],
  ]

  // Wärmeerzeuger mit ihrem Baujahr, wo eines bekannt ist – das Alter der
  // Heizung ist die Angabe, nach der ein Berater als Erstes fragt.
  const generators = data.heatGenerators.map((g) => {
    const label = t(`onboarding.step4.generators.${g}`)
    const year = data.heatGeneratorYears[g]
    return Number.isFinite(year) && (year ?? 0) > 0 ? `${label} (${year})` : label
  })

  const systems: ProfileRow[] = [
    [t('onboarding.step8.labels.heatGenerators'), list(generators)],
    [t('onboarding.step8.labels.hotWater'), opt('onboarding.step4.hotWaterOptions', data.hotWaterType)],
    [t('onboarding.step8.labels.hasExtraFireplace'), yesNo(t, data.hasExtraFireplace)],
    [t('onboarding.step8.labels.hasPV'), opt('onboarding.step4.pvOptions', data.hasPV)],
    [
      t('onboarding.step8.labels.smartHomeDevices'),
      list(
        data.smartHomeDevices
          .filter((d) => d !== 'none')
          .map((d) => t(`onboarding.step6.smartHomeOptions.${d}`)),
      ),
    ],
    // Die Messgeräte werden nicht mehr erhoben (siehe „Gebäudehülle" oben,
    // gleiche Begründung): Ein neues Profil bekommt die Zeile gar nicht, statt
    // ein „nicht angegeben" zu einer Frage zu zeigen, die niemand gestellt hat.
    ...retired([
      [
        t('report.pdf.profile.instruments'),
        list(data.instruments.map((i) => t(`onboarding.step6.instruments.${i.type}`))),
      ],
    ]),
  ]

  return [
    { title: t('report.pdf.profile.building'), rows: building },
    { title: t('report.pdf.profile.household'), rows: household },
    { title: t('report.pdf.profile.systems'), rows: systems },
    // Der Sanierungs-Log wird nicht mehr erhoben (siehe oben). Ein
    // Bestandsprofil behält seinen Block; ein neues bekommt ihn gar nicht mehr,
    // statt eines Kapitels, das nur „nicht beantwortet" sagt.
    ...(data.renovations === null
      ? []
      : [{ title: t('report.pdf.profile.renovations'), rows: renovationRows(data.renovations, t) }]),
  ]
}

/**
 * Sanierungen als Ereignis-Log, chronologisch.
 *
 * Nimmt nur noch die beantworteten Fälle: „nie saniert" (`[]`) ist eine
 * Antwort und bekommt ihre Zeile. „Nicht beantwortet" (`null`) hat seit dem
 * Wegfall des Schritts „Gebäudehülle" keinen Adressaten mehr – die Frage wird
 * nicht gestellt, also kann der Bericht sie dem Leser auch nicht als offene
 * Lücke vorhalten. Der Aufrufer lässt das Kapitel dann ganz weg.
 */
function renovationRows(renovations: readonly RenovationEvent[], t: TFunction): ProfileRow[] {
  if (renovations.length === 0) {
    return [[t('report.pdf.profile.renovationState'), t('report.pdf.profile.renovationNever')]]
  }
  return [...renovations]
    .sort((a, b) => a.year - b.year)
    .map((event) => [
      String(event.year),
      list(event.items.map((i) => t(`onboarding.step7renovation.renovationItemOptions.${i}`))),
    ])
}
