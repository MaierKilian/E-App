/**
 * Schriftgröße des Zählerstands auf den Kacheln der Zuhause-Karte.
 *
 * Die Kacheln sind schmal und fest breit – „268" und „7.370.123" können darin
 * nicht dieselbe Größe haben. Vorher stand am Wert ein `truncate`, das aus
 * „7.370" ein „7.3…" machte: ein gekürzter Zählerstand ist keine Information
 * mehr. Statt zu kürzen wird die Schrift stufenweise kleiner, sodass auch ein
 * langer Stand vollständig lesbar bleibt.
 *
 * Eigene Datei, weil ein Modul mit React-Komponenten nichts anderes exportieren
 * darf, ohne Fast Refresh zu brechen (`react-refresh/only-export-components`).
 *
 * @param formatted Der bereits lokalisierte Zählerstand (mit Tausenderpunkten).
 */
export function valueSizeClass(formatted: string): string {
  if (formatted.length <= 5) return 'text-xl'
  if (formatted.length <= 7) return 'text-lg'
  if (formatted.length <= 9) return 'text-base'
  return 'text-sm'
}
