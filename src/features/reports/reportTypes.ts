/**
 * Abschnitte des Berichts. Der Bericht ist die Summe der gewählten Abschnitte –
 * Messungen, Monitoring oder beides. Einen Umfang (kurz/lang) gibt es nicht
 * mehr: Ein Bericht, der Ergebnisse weglässt, um kürzer zu sein, beantwortet
 * genau die Fragen nicht, wegen derer man ihn weitergibt.
 *
 * Die Gebäudedaten aus dem Profil sind bewusst kein Abschnitt: Stammdaten, die
 * der Empfänger ohnehin kennt, machen aus einem Bericht keine Aussage.
 */
export interface ReportSections {
  measurements: boolean
  monitoring: boolean
}
