// Lerntage statt Kalendertage (Phase 0).
//
// Wer um 1 Uhr nachts noch Karten macht, empfindet das als denselben Lerntag –
// und würde bei einer Tagesgrenze um Mitternacht seinen Streak verlieren und die
// Tagesziele zweimal sehen. Deshalb liegt die Grenze einstellbar (Standard 4 Uhr
// morgens, `dayCutoffHour`).
//
// Alle Funktionen rechnen in der Zeitzone des Geräts. An Zeitumstellungstagen
// kann ein Lerntag deshalb 23 oder 25 Stunden haben – für Streak und Statistik
// ist das gewollt, denn es entspricht dem, was der Nutzer erlebt.

const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

/** Beginn des Lerntags, zu dem `ts` gehört (ms). */
export function dayStart(ts: number, cutoffHour: number): number {
  const d = new Date(ts - cutoffHour * HOUR_MS)
  d.setHours(0, 0, 0, 0)
  return d.getTime() + cutoffHour * HOUR_MS
}

/** Beginn des folgenden Lerntags – z. B. für „Karte auf morgen vertagen". */
export function nextDayStart(ts: number, cutoffHour: number): number {
  return dayStart(ts + DAY_MS, cutoffHour)
}

/** Schlüssel eines Lerntags im Format `YYYY-MM-DD` (Ortszeit). */
export function dayKey(ts: number, cutoffHour: number): string {
  const d = new Date(dayStart(ts, cutoffHour))
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Anzahl der Lerntage von `from` bis `to` (0, wenn derselbe Tag). */
export function dayDiff(from: number, to: number, cutoffHour: number): number {
  return Math.round((dayStart(to, cutoffHour) - dayStart(from, cutoffHour)) / DAY_MS)
}

/** Alle Lerntags-Schlüssel von `from` bis `to` (einschließlich, aufsteigend). */
export function dayKeyRange(from: number, to: number, cutoffHour: number): string[] {
  const out: string[] = []
  const count = dayDiff(from, to, cutoffHour)
  if (count < 0) return out
  let cursor = dayStart(from, cutoffHour)
  for (let i = 0; i <= count; i++) {
    out.push(dayKey(cursor, cutoffHour))
    cursor = nextDayStart(cursor, cutoffHour)
  }
  return out
}
