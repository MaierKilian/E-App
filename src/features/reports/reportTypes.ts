/**
 * Abschnitte des Berichts. Der Bericht ist die Summe der gewählten Abschnitte –
 * Messungen, Monitoring oder beides. Einen Umfang (kurz/lang) gibt es nicht
 * mehr: Ein Bericht, der Ergebnisse weglässt, um kürzer zu sein, beantwortet
 * genau die Fragen nicht, wegen derer man ihn weitergibt.
 *
 * Die Gebäudedaten aus dem Profil sind weiterhin kein wählbarer Abschnitt –
 * seit 09/2026 aber aus dem umgekehrten Grund: Sie eröffnen den Bericht als
 * fester Steckbrief („Das ist dein Haushalt"). Die frühere Begründung –
 * Stammdaten, die der Empfänger ohnehin kennt – hielt nicht: Wer das PDF
 * bekommt, ist typischerweise gerade jemand, der die Wohnung nicht kennt, und
 * ohne Baujahr, Heizung und Sanierungsstand sind die Messwerte nicht
 * einzuordnen. Abwählbar ist er trotzdem nicht: Ein Bericht ohne sein Objekt
 * ist eine Zahlenliste.
 */
export interface ReportSections {
  measurements: boolean
  monitoring: boolean
}
