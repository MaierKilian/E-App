/**
 * Gemeinsame Anzeige-Politik für geschätzte Jahres-Ersparnisse in Euro.
 *
 * Jede €-Angabe der App ist das Ergebnis einer Kette von Schätzungen
 * (Hochrechnungen, Faustregeln, typische Nutzungshäufigkeiten). Damit die
 * Anzeige nicht mehr Genauigkeit behauptet, als in den Zahlen steckt, gelten
 * überall dieselben zwei Regeln:
 *
 * 1. **Unter {@link MIN_DISPLAY_EUR} wird kein €-Wert gezeigt.** Kleinbeträge
 *    liegen innerhalb der Modellunsicherheit, rechtfertigen keine
 *    Verhaltensänderung – und sind der Punkt, an dem eine Schätzung angreifbar
 *    wird. Statt einer Zahl steht dann die qualitative bzw. die *gemessene*
 *    Aussage (Liter, Watt, °C), die niemand nachrechnen muss.
 * 2. **Gerundet wird auf {@link EUR_ROUNDING_STEP}.** Ein Punktwert auf den
 *    Euro genau wäre Schein-Genauigkeit.
 *
 * Diese Regeln stammen aus dem Raumklima-Check und gelten seit der
 * Vereinheitlichung für alle Messungen und alle Empfehlungen.
 */

/** Unterhalb dieses Betrags wird **kein** €-Wert gezeigt. */
export const MIN_DISPLAY_EUR = 20

/** Schrittweite der €-Anzeige. */
export const EUR_ROUNDING_STEP = 5

/**
 * Rundet eine geschätzte Jahres-Ersparnis auf einen darstellbaren Wert.
 * Liefert `undefined`, wenn der Betrag unter {@link MIN_DISPLAY_EUR} liegt –
 * dann zeigt die UI die gemessene Größe statt eines Euro-Betrags.
 */
export function displaySavingEur(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < MIN_DISPLAY_EUR) return undefined
  return Math.round(value / EUR_ROUNDING_STEP) * EUR_ROUNDING_STEP
}

/**
 * Grobe Unsicherheits-Spanne einer €-Schätzung, auf {@link EUR_ROUNDING_STEP}
 * gerundet. Bewusst als Bereich statt als centgenaue Einzelzahl.
 *
 * Bewusst **ohne Untergrenze**: Ein Boden (früher „mindestens 5 €") hätte aus
 * einer errechneten Ersparnis von 1 € ein „ca. 5–10 €/Jahr" gemacht und damit
 * Geld erfunden, das die Rechnung nie hergab. Kleinbeträge werden stattdessen
 * über {@link displaySavingEur} gar nicht erst als € gezeigt.
 */
export function savingRange(eur: number): { low: number; high: number } {
  const round5 = (n: number) => Math.round(n / EUR_ROUNDING_STEP) * EUR_ROUNDING_STEP
  const low = round5(eur * 0.8)
  const high = Math.max(low + EUR_ROUNDING_STEP, round5(eur * 1.2))
  return { low, high }
}

/**
 * Wann ueberhaupt ein Euro-Betrag erscheinen darf.
 *
 * Kriterium: **Jede Groesse der Rechnung muss gemessen, vom Nutzer angegeben
 * oder ein Preis sein.** Sobald eine Nutzungshaeufigkeit oder ein Verbrauch
 * geschaetzt wird, entfaellt der Betrag – dann zeigt die App stattdessen die
 * Menge, die tatsaechlich gemessen wurde (Liter, kWh, Prozent).
 *
 * Der Grund ist nicht Vorsicht, sondern Verteidigbarkeit: Eine Zahl, deren
 * groesste Unsicherheit in einer erfundenen Haeufigkeit steckt ("1,5 Duschen
 * pro Tag"), laesst sich in keiner Vorfuehrung begruenden. Eine gemessene
 * Wassermenge dagegen schon.
 *
 * Danach gilt zusaetzlich {@link displaySavingEur}: auch ein belastbarer Wert
 * wird unterhalb von {@link MIN_DISPLAY_EUR} nicht gezeigt.
 */
export function isMeasuredSaving(details: Record<string, number> | undefined): boolean {
  // Mehrere Messungen markieren ihre eigene Schaetzung bereits selbst.
  return (details?.savingEstimated ?? 0) !== 1
}
