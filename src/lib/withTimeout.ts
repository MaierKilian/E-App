/**
 * Begrenzt die Wartezeit eines Versprechens.
 *
 * Gedacht für Netzaufrufe, die im Fehlerfall nicht abbrechen, sondern hängen:
 * Firestore lehnt eine Leseanfrage nicht ab, wenn die Verbindung nur halb steht
 * (typisch, wenn das Handy aus dem Standby kommt) – es wartet unbegrenzt auf den
 * Server. Ein hängender Aufruf ist schlimmer als ein fehlgeschlagener, weil kein
 * Fehlerpfad greift: Ladezustände bleiben stehen, Wiederholungen setzen nie ein.
 *
 * Das zugrunde liegende Versprechen wird nicht abgebrochen (das kann ein
 * Promise nicht) – es läuft weiter und sein Ergebnis wird verworfen. Der Aufrufer
 * bekommt nach `ms` eine Ablehnung und kann darauf reagieren.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: Zeitlimit nach ${ms} ms`)), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}
