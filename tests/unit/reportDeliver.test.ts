// Auslieferung der Berichts-PDFs: teilen, wenn das Gerät es kann, sonst Download.

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { jsPDF } from 'jspdf'
import { canSharePdf, deliverReport } from '@/features/reports/pdf/deliver'

/** Minimales jsPDF-Double: liefert einen Blob und merkt sich save(). */
function fakeDoc() {
  const save = vi.fn()
  const doc = {
    output: () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }),
    save,
  } as unknown as jsPDF
  return { doc, save }
}

/** Setzt einen navigator mit den gewünschten Share-Fähigkeiten. */
function stubNavigator(nav: Partial<Navigator> | undefined) {
  vi.stubGlobal('navigator', nav)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('canSharePdf', () => {
  it('ist false ohne Web-Share-Unterstützung', () => {
    stubNavigator({})
    expect(canSharePdf()).toBe(false)
  })

  it('ist false, wenn das Gerät Dateien ablehnt', () => {
    stubNavigator({ canShare: () => false, share: vi.fn() } as unknown as Navigator)
    expect(canSharePdf()).toBe(false)
  })

  it('ist true, wenn PDF-Dateien angenommen werden', () => {
    stubNavigator({ canShare: () => true, share: vi.fn() } as unknown as Navigator)
    expect(canSharePdf()).toBe(true)
  })
})

describe('deliverReport', () => {
  it('lädt herunter, wenn nicht geteilt werden kann', async () => {
    stubNavigator({})
    const { doc, save } = fakeDoc()

    await expect(deliverReport({ doc, fileName: 'bericht.pdf' }, 'Monitoring')).resolves.toBe(
      'downloaded',
    )
    expect(save).toHaveBeenCalledWith('bericht.pdf')
  })

  it('teilt die Datei samt Dateiname und Typ', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ canShare: () => true, share } as unknown as Navigator)
    const { doc, save } = fakeDoc()

    await expect(deliverReport({ doc, fileName: 'bericht.pdf' }, 'Monitoring')).resolves.toBe(
      'shared',
    )
    expect(save).not.toHaveBeenCalled()

    const payload = share.mock.calls[0][0] as { files: File[]; title: string }
    expect(payload.title).toBe('Monitoring')
    expect(payload.files[0].name).toBe('bericht.pdf')
    expect(payload.files[0].type).toBe('application/pdf')
  })

  it('wertet den Abbruch im Teilen-Dialog nicht als Fehler und lädt nichts herunter', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('abgebrochen', 'AbortError'))
    stubNavigator({ canShare: () => true, share } as unknown as Navigator)
    const { doc, save } = fakeDoc()

    await expect(deliverReport({ doc, fileName: 'bericht.pdf' }, 'Monitoring')).resolves.toBe(
      'cancelled',
    )
    expect(save).not.toHaveBeenCalled()
  })

  it('fällt bei einem echten Teilen-Fehler auf den Download zurück', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const share = vi.fn().mockRejectedValue(new Error('kein Ziel'))
    stubNavigator({ canShare: () => true, share } as unknown as Navigator)
    const { doc, save } = fakeDoc()

    await expect(deliverReport({ doc, fileName: 'bericht.pdf' }, 'Monitoring')).resolves.toBe(
      'downloaded',
    )
    expect(save).toHaveBeenCalledWith('bericht.pdf')
  })
})
