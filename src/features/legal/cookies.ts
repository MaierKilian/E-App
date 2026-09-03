/**
 * Aufräumen der von Google Analytics gesetzten Cookies.
 *
 * Nötig beim Widerruf (Art. 7 Abs. 3 DSGVO): Wer die Einwilligung zurücknimmt,
 * darf keine Wiedererkennungs-Kennung auf dem Gerät zurückbehalten. Analytics
 * wird ohne Einwilligung gar nicht erst geladen – dieser Code greift also nur
 * für den Fall, dass vorher eingewilligt worden war.
 */

/**
 * Präfixe der Google-Analytics-Cookies:
 *   `_ga`          – Client-ID (2 Jahre)
 *   `_ga_<ID>`     – Sitzungsstatus je Datenstrom (GA4)
 *   `_gid`/`_gat`  – ältere bzw. Drosselungs-Cookies
 */
const ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat']

/**
 * Kandidaten für das `domain`-Attribut. Ein Cookie lässt sich nur mit exakt der
 * Domain löschen, mit der es gesetzt wurde – GA setzt auf der Registrierbaren
 * Domain, die App läuft aber auch auf Subdomains. Deshalb alle Ebenen von der
 * aktuellen Hostbezeichnung aufwärts durchgehen; ungültige Werte ignoriert der
 * Browser folgenlos.
 */
function domainCandidates(hostname: string): (string | null)[] {
  const parts = hostname.split('.')
  const candidates: (string | null)[] = [null]
  for (let i = 0; i < parts.length - 1; i += 1) {
    const domain = parts.slice(i).join('.')
    candidates.push(domain, `.${domain}`)
  }
  return candidates
}

/** Namen aller Analytics-Cookies in einem `document.cookie`-String. */
export function analyticsCookieNames(cookieHeader: string): string[] {
  if (!cookieHeader) return []
  return cookieHeader
    .split(';')
    .map((entry) => entry.split('=')[0]?.trim() ?? '')
    .filter((name) => ANALYTICS_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)))
}

/**
 * Baut die `document.cookie`-Zuweisungen, die alle Analytics-Cookies löschen.
 *
 * Bewusst als reine Funktion von (Cookie-String, Hostname) auf die Liste der
 * Zuweisungen – so ist der Teil, auf den es ankommt, ohne Browser prüfbar.
 */
export function analyticsCookieDeletions(cookieHeader: string, hostname: string): string[] {
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
  const domains = domainCandidates(hostname)
  return analyticsCookieNames(cookieHeader).flatMap((name) =>
    domains.map((domain) => `${name}=; path=/; ${expired}${domain ? `; domain=${domain}` : ''}`),
  )
}

/**
 * Löscht alle Analytics-Cookies dieses Browsers. Fehlerfrei aufrufbar, auch
 * wenn gar keine gesetzt sind.
 */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  for (const assignment of analyticsCookieDeletions(
    document.cookie,
    window.location.hostname,
  )) {
    document.cookie = assignment
  }
}
