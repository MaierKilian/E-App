// Prüfungen an der Einwilligungs-Logik.
//
// Der Kern ist eine rechtliche Zusage, keine Bequemlichkeitsfunktion: Ohne
// ausdrückliche Einwilligung darf keine Statistik laufen (§ 25 Abs. 1 TDDDG).
// Genau das prüfen die Tests hier – ein „Standard an" oder eine still
// weitergeltende Alt-Entscheidung wäre ein Rechtsverstoß, kein Schönheitsfehler.

import { describe, expect, it, beforeEach } from 'vitest'
import {
  CONSENT_VERSION,
  hasAnalyticsConsent,
  isDecisionCurrent,
  needsConsentDecision,
  useConsentStore,
} from '@/features/legal/consent'
import { analyticsCookieDeletions, analyticsCookieNames } from '@/features/legal/cookies'
import {
  addressLines,
  isOperatorComplete,
  missingOperatorFields,
  responsiblePerson,
  type OperatorInfo,
} from '@/features/legal/operator'

beforeEach(() => {
  useConsentStore.setState({ decision: null, settingsOpen: false })
})

describe('Einwilligung', () => {
  it('gilt ohne Entscheidung als nicht erteilt', () => {
    expect(hasAnalyticsConsent()).toBe(false)
    expect(needsConsentDecision(null)).toBe(true)
  })

  it('erteilt Statistik erst nach ausdrücklichem Akzeptieren', () => {
    useConsentStore.getState().acceptAll()
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('erteilt beim Ablehnen keine Statistik, gilt aber als entschieden', () => {
    useConsentStore.getState().rejectAll()
    expect(hasAnalyticsConsent()).toBe(false)
    expect(needsConsentDecision(useConsentStore.getState().decision)).toBe(false)
  })

  it('hält den Zeitpunkt der Entscheidung fest (Nachweis nach Art. 7 DSGVO)', () => {
    useConsentStore.getState().acceptAll()
    const { decision } = useConsentStore.getState()
    expect(decision?.version).toBe(CONSENT_VERSION)
    expect(Number.isNaN(Date.parse(decision!.decidedAt))).toBe(false)
  })

  it('fragt nach einem Widerruf erneut', () => {
    useConsentStore.getState().acceptAll()
    useConsentStore.getState().revoke()
    expect(hasAnalyticsConsent()).toBe(false)
    expect(needsConsentDecision(useConsentStore.getState().decision)).toBe(true)
  })

  it('verwirft eine Entscheidung zu einer älteren Fassung', () => {
    const outdated = {
      analytics: true,
      version: CONSENT_VERSION - 1,
      decidedAt: new Date().toISOString(),
    }
    expect(isDecisionCurrent(outdated)).toBe(false)
    useConsentStore.setState({ decision: outdated })
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('übernimmt eine feingranulare Auswahl', () => {
    useConsentStore.getState().saveChoice({ analytics: false })
    expect(hasAnalyticsConsent()).toBe(false)
    useConsentStore.getState().saveChoice({ analytics: true })
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('schließt das Einstellungsfenster mit jeder Entscheidung', () => {
    useConsentStore.getState().openSettings()
    useConsentStore.getState().saveChoice({ analytics: true })
    expect(useConsentStore.getState().settingsOpen).toBe(false)
  })
})

describe('Analytics-Cookies aufräumen', () => {
  const header = '_ga=GA1.1.123.456; _ga_ABC123=GS1.1.789; eapp-keep=1; _gid=GA1.1.9'

  it('erkennt genau die Analytics-Cookies', () => {
    expect(analyticsCookieNames(header)).toEqual(['_ga', '_ga_ABC123', '_gid'])
  })

  it('lässt fremde Cookies unberührt', () => {
    const deletions = analyticsCookieDeletions(header, 'e-app-info.web.app')
    expect(deletions.some((entry) => entry.startsWith('eapp-keep'))).toBe(false)
  })

  it('löscht jedes Cookie ohne und mit Domain-Angabe', () => {
    const deletions = analyticsCookieDeletions('_ga=1', 'app.example.com')
    // Ohne Domain plus je zwei Schreibweisen für jede Ebene ab „app.example.com".
    expect(deletions).toEqual([
      '_ga=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
      '_ga=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=app.example.com',
      '_ga=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.app.example.com',
      '_ga=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=example.com',
      '_ga=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.example.com',
    ])
  })

  it('liefert für einen leeren Cookie-String nichts zu löschen', () => {
    expect(analyticsCookieDeletions('', 'example.com')).toEqual([])
  })
})

describe('Betreiberangaben', () => {
  const complete: OperatorInfo = {
    name: 'Erika Mustermann',
    street: 'Musterweg 1',
    postalCode: '12345',
    city: 'Musterstadt',
    country: 'Deutschland',
    email: 'kontakt@example.org',
    phone: '',
    responsibleForContent: '',
  }

  it('erkennt vollständige Pflichtangaben', () => {
    expect(isOperatorComplete(complete)).toBe(true)
    expect(missingOperatorFields(complete)).toEqual([])
  })

  it('meldet jede fehlende Pflichtangabe einzeln', () => {
    const incomplete = { ...complete, street: '  ', email: '' }
    expect(isOperatorComplete(incomplete)).toBe(false)
    expect(missingOperatorFields(incomplete)).toEqual(['street', 'email'])
  })

  it('nutzt den Betreibernamen, wenn kein eigener Verantwortlicher gesetzt ist', () => {
    expect(responsiblePerson(complete)).toBe('Erika Mustermann')
    expect(responsiblePerson({ ...complete, responsibleForContent: 'Max Muster' })).toBe(
      'Max Muster',
    )
  })
})

describe('Anschrift im Impressum', () => {
  const base: OperatorInfo = {
    name: 'Erika Mustermann',
    street: 'Musterweg 1',
    postalCode: '12345',
    city: 'Musterstadt',
    country: 'Deutschland',
    email: 'kontakt@example.org',
    phone: '',
    responsibleForContent: '',
  }

  it('setzt die Zeilen aus Straße, PLZ/Ort und Land zusammen', () => {
    expect(addressLines(base)).toEqual(['Musterweg 1', '12345 Musterstadt', 'Deutschland'])
  })

  it('zeigt nichts an, solange die Anschrift unvollständig ist', () => {
    // Sonst stünde unter „Anbieter" nur „Deutschland" – formal gefüllt,
    // inhaltlich wertlos, und der Fehler fiele niemandem auf.
    expect(addressLines({ ...base, street: '' })).toEqual([])
    expect(addressLines({ ...base, city: '' })).toEqual([])
  })
})
