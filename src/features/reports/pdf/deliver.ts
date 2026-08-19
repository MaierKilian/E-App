import type { jsPDF } from 'jspdf'

/**
 * Auslieferung fertiger Berichts-PDFs.
 *
 * Auf dem Telefon ist „Teilen" der natürliche Weg: das Systemblatt bietet
 * Sichern, Mail, Messenger und eine Vorschau in einem Schritt. Wo die Web
 * Share API keine Dateien annimmt (Desktop-Browser, ältere Systeme), fällt die
 * Auslieferung auf den klassischen Download zurück.
 */

/** Ein fertiges Berichts-PDF samt Dateiname. */
export interface ReportDocument {
  doc: jsPDF
  fileName: string
}

/** Wie das PDF beim Nutzer gelandet ist. */
export type DeliveryResult = 'shared' | 'downloaded' | 'cancelled'

/** Baut eine PDF-Datei aus dem jsPDF-Dokument. */
function toFile({ doc, fileName }: ReportDocument): File {
  return new File([doc.output('blob')], fileName, { type: 'application/pdf' })
}

/**
 * Prüft, ob dieses Gerät PDF-Dateien über das System teilen kann.
 * Wird für die Beschriftung der Schaltfläche gebraucht, deshalb synchron.
 */
export function canSharePdf(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    const probe = new File([new Blob([])], 'bericht.pdf', { type: 'application/pdf' })
    return navigator.canShare({ files: [probe] })
  } catch {
    // Ältere Browser ohne File-Konstruktor o. Ä. – dann eben Download.
    return false
  }
}

/**
 * Liefert den Bericht aus: teilen, wenn möglich, sonst herunterladen.
 * Bricht der Nutzer das Systemblatt ab, ist das kein Fehler.
 */
export async function deliverReport(
  report: ReportDocument,
  shareTitle: string,
): Promise<DeliveryResult> {
  if (canSharePdf()) {
    try {
      await navigator.share({ files: [toFile(report)], title: shareTitle })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Teilen abgelehnt oder kein Ziel verfügbar – Download als Rückfallebene.
      console.warn('[reports] Teilen nicht möglich, Download stattdessen', error)
    }
  }
  report.doc.save(report.fileName)
  return 'downloaded'
}
