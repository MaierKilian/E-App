import { jsPDF } from 'jspdf'
import { isoToTime, timeAxisPositions } from '@/lib/timeAxis'

/**
 * Wiederverwendbares PDF-Design-Kit (jsPDF) für die E-App-Berichte.
 *
 * Alles arbeitet in Punkt (pt) auf A4. Der `PdfKit` kapselt den Cursor,
 * Seitenumbruch und ein Set an grafischen Bausteinen (Kopf, Abschnitts- und
 * Gruppentitel, Kennzahl-Kacheln, Befund-Karten, Diagramme als Vektor,
 * Tabellen, Chips).
 *
 * Gestaltungsgrundsätze:
 * - **Eine Fluchtlinie.** Alles beginnt bei {@link MARGIN_X}; es gibt keinen
 *   zweiten Einzug für den Kopf. Nichts sieht schneller unfertig aus als ein
 *   Titel, der nicht über den Abschnitten steht.
 * - **Drei Ebenen, drei Formen.** Bericht (Kopf) → Abschnitt → Gruppe sind
 *   klar unterschieden. Vorher sahen alle drei gleich aus, dadurch war die
 *   Gliederung nicht lesbar.
 * - **Farbe ist Bedeutung, nicht Dekoration.** Grau ist die Grundfarbe (wie in
 *   der App), Farbe tragen nur Bewertung und Energieträger – und nie allein:
 *   neben jeder Farbe steht ihr Wort.
 *
 * Schrift: jsPDF-Standard (Helvetica, Latin-1). Unicode-Sonderzeichen werden
 * über {@link toLatin1} normalisiert, damit nichts als „Kästchen" erscheint.
 */

// --- A4-Geometrie in pt ---
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_X = 48
const MARGIN_TOP = 54
// Untere Grenze des Satzspiegels: die Fußzeilen-Linie liegt bei
// PAGE_H - 44, darüber bleiben 12 pt Luft. Großzügiger bemessen verschenkt
// der Satz eine ganze Zeile pro Seite.
const MARGIN_BOTTOM = 56
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Tabellen-Maße: Zeilen- und Kopfhöhe sowie das seitliche Zellpolster.
const TABLE_ROW_H = 19
const TABLE_HEAD_H = 18
const CELL_PAD = 6
/** Grundlinie der Fußzeile, gemessen vom Seitenende. */
const FOOTER_BASELINE = PAGE_H - 32

/** RGB-Farbtripel. */
export type RGB = [number, number, number]

/**
 * Zentrale Palette – dieselben Werte wie die Design-Tokens der App
 * (`src/index.css`, helles Theme). Der Bericht soll aussehen wie die App auf
 * Papier, nicht wie ein zweites Produkt.
 */
export const PALETTE = {
  ink: [9, 9, 11] as RGB, // --fg
  strong: [24, 24, 27] as RGB, // --primary
  body: [63, 63, 70] as RGB,
  muted: [113, 113, 122] as RGB, // --muted
  faint: [161, 161, 170] as RGB,
  hair: [228, 228, 231] as RGB, // --border
  rule: [212, 212, 216] as RGB,
  shade: [244, 244, 245] as RGB, // --surface-2
  card: [250, 250, 250] as RGB, // --bg
  white: [255, 255, 255] as RGB,
  // Bewertungsfarben: die HELLEN Werte aus src/index.css (--rating-*). Papier
  // ist immer hell, deshalb gilt hier fest der Satz für helle Flächen; die
  // dunklen Varianten der App wären auf Weiß nicht lesbar.
  good: [21, 128, 61] as RGB, // #15803d
  medium: [180, 83, 9] as RGB, // #b45309
  elevated: [194, 65, 12] as RGB, // #c2410c
  high: [185, 28, 28] as RGB, // #b91c1c
}

/** Rating-Schlüssel → Palette-Farbe (spiegelt measurements/rating.ts). */
export function ratingColor(rating: 'good' | 'medium' | 'elevated' | 'high'): RGB {
  if (rating === 'good') return PALETTE.good
  if (rating === 'medium') return PALETTE.medium
  if (rating === 'elevated') return PALETTE.elevated
  return PALETTE.high
}

/**
 * Ersetzt Unicode-Zeichen, die die Standardschrift nicht darstellen kann.
 *
 * Die jsPDF-Standardfonts sind mit `WinAnsiEncoding` (CP1252) eingebettet.
 * Darin liegen Gedankenstrich, Mittelpunkt, typografische Anführungszeichen,
 * Auslassungspunkte, Aufzählungspunkt und € – die bleiben deshalb erhalten.
 * Ersetzt werden nur Zeichen außerhalb von CP1252 (Tiefstellungen, Pfeile,
 * schmale Leerzeichen), die sonst als Müll oder Kästchen erscheinen.
 */
export function toLatin1(input: string): string {
  if (!input) return ''
  const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
  return input
    .replace(/[₀-₉]/g, (ch) => String(SUBSCRIPTS.indexOf(ch)))
    .replace(/[→➜➔]/g, '->')
    .replace(/[↑]/g, '+')
    .replace(/[↓]/g, '-')
    .replace(/[\u2212]/g, '-')
    .replace(/[\u2007\u202F\u2009\u2002\u2003]/g, ' ')
}

/** Wandelt einen Hex-Farbwert („#f59e0b") in ein RGB-Tripel. */
export function hexToRgb(hex: string, fallback: RGB = PALETTE.ink): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mischt eine Farbe mit Weiß auf (0 = Original, 1 = Weiß). */
export function tint(color: RGB, amount: number): RGB {
  const a = Math.min(1, Math.max(0, amount))
  return color.map((c) => Math.round(c + (255 - c) * a)) as RGB
}

/** Eine Kennzahl-Kachel. */
export interface KpiCard {
  value: string
  label: string
  sub?: string
  color?: RGB
}

/** Ein Datenpunkt für das Liniendiagramm. */
export interface LinePoint {
  date: string
  value: number
}

/** Optionen für das Liniendiagramm. */
export interface LineChartOptions {
  height?: number
  unit?: string
  color?: RGB
  language?: string
  /** Satz, der statt des Diagramms steht, wenn es nichts zu zeichnen gibt. */
  emptyNote?: string
}

/**
 * Ein Balken über einem Zeitintervall. Die Breite ergibt sich aus der Länge des
 * Intervalls, nicht aus der Anzahl der Balken – sonst stünde ein Balken für 253
 * Tage gleich breit neben einem für 8 Tage.
 */
export interface IntervalBar {
  /** ISO-Datum des Intervallanfangs. */
  from: string
  /** ISO-Datum des Intervallendes. */
  to: string
  /** Bereits normierter Wert, z. B. Verbrauch pro Tag. */
  value: number
}

/** Waagerechte Bezugslinie im Diagramm, etwa der Mittelwert. */
export interface ChartReference {
  value: number
  label: string
}

/** Optionen für den Berichtskopf. */
export interface MastheadOptions {
  title: string
  /** Zweite Zeile – üblicherweise das Objekt (Profilname). */
  subtitle?: string
  /** Dritte Zeile – Umfang/Zeitraum des Berichts. */
  meta?: string
  date?: string
}

/** Ein Befund (erledigte Messung) als Karte. */
export interface FindingCard {
  /** Bewertungsfarbe – begleitet stets `ratingLabel`, nie allein. */
  color: RGB
  title: string
  value: string
  ratingLabel: string
  /** Optionaler zweiter Chip, z. B. Sparpotenzial. */
  noteLabel?: string
  /**
   * Kleine Zeile unter dem Titel: Ort und Zeitpunkt der Messung. Ohne sie ist
   * ein weitergegebener Bericht nicht einzuordnen – man sieht Werte, aber
   * nicht, wo und wann sie entstanden sind.
   */
  meta?: string
  /** Einordnung in einem Satz. */
  summary?: string
  /**
   * Handlungsempfehlungen; erscheinen als abgesetzter Block. Mehrere, weil eine
   * Messung mehrere Befunde haben kann – das Raumklima etwa Temperatur,
   * Luftfeuchte und Zugluft.
   */
  tips?: string[]
  /** Beschriftung des Tipp-Blocks („Tipp"). */
  tipLabel?: string
}

/** Eine Leitkennzahl der Zusammenfassung. */
export interface HeroStat {
  label: string
  value: string
  /** Erläuterung unter dem Wert, z. B. der Zeitraum. */
  sub?: string
  color?: RGB
}

/** Eine offene Messung in der Checkliste. */
export interface ChecklistItem {
  title: string
  tag: string
}

/** Textoptionen des internen Satz-Helfers. */
interface TextOptions {
  size?: number
  bold?: boolean
  color?: RGB
  align?: 'left' | 'center' | 'right'
  maxWidth?: number
  /** Zusätzlicher Buchstabenabstand – für Versalzeilen (Eyebrows). */
  track?: number
}

/**
 * Kapselt ein jsPDF-Dokument samt Cursor, Seitenumbruch und Zeichenhelfern.
 */
export class PdfKit {
  readonly doc: jsPDF
  private y: number

  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: 'a4' })
    this.y = MARGIN_TOP
  }

  // --- Cursor / Seiten ---

  /** Aktuelle Y-Position des Cursors. */
  get cursorY(): number {
    return this.y
  }

  /** Rückt den Cursor um `dy` pt vor. */
  advance(dy: number): void {
    this.y += dy
  }

  /** Beginnt eine neue Seite, falls `needed` pt nicht mehr passen. */
  ensure(needed: number): void {
    if (this.y + needed > PAGE_H - MARGIN_BOTTOM) {
      this.doc.addPage()
      this.y = MARGIN_TOP
    }
  }

  /** Erzwingt eine neue Seite. */
  newPage(): void {
    this.doc.addPage()
    this.y = MARGIN_TOP
  }

  /** Steht der Cursor am Seitenanfang? Dann entfällt der Abstand nach oben. */
  private get atPageTop(): boolean {
    return this.y <= MARGIN_TOP + 0.5
  }

  private setFill(c: RGB): void {
    this.doc.setFillColor(c[0], c[1], c[2])
  }

  private setDraw(c: RGB): void {
    this.doc.setDrawColor(c[0], c[1], c[2])
  }

  // --- Satz-Helfer ---

  /** Setzt eine Zeile Text. `y` ist die Grundlinie. */
  private put(text: string, x: number, y: number, o: TextOptions = {}): void {
    const { size = 9.5, bold = false, color = PALETTE.body, align = 'left', maxWidth, track } = o
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    this.doc.setTextColor(color[0], color[1], color[2])
    this.doc.text(toLatin1(text), x, y, {
      align,
      ...(maxWidth !== undefined ? { maxWidth } : {}),
      ...(track !== undefined ? { charSpace: track } : {}),
    })
  }

  /** Breite einer Textzeile inklusive Sperrung (`getTextWidth` kennt sie nicht). */
  private measure(text: string, o: TextOptions = {}): number {
    const { size = 9.5, bold = false, track = 0 } = o
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    const clean = toLatin1(text)
    return this.doc.getTextWidth(clean) + track * Math.max(0, clean.length - 1)
  }

  /** Bricht Text auf eine Breite um. */
  private wrap(text: string, width: number, o: TextOptions = {}): string[] {
    const { size = 9.5, bold = false } = o
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    return this.doc.splitTextToSize(toLatin1(text), width) as string[]
  }

  /**
   * Versal gesetzte Kleinzeile („Eyebrow"). Sperrung ist hier keine Spielerei:
   * Versalien ohne Sperrung wirken gedrängt und unsauber.
   */
  private eyebrow(text: string, x: number, y: number, color: RGB, size = 7.5): void {
    this.put(text.toUpperCase(), x, y, { size, bold: true, color, track: size * 0.11 })
  }

  /**
   * Ein Chip (Pille) mit Text. Gibt seine Breite zurück, damit sich mehrere
   * aneinanderreihen oder rechtsbündig setzen lassen. `y` ist die Oberkante.
   */
  private chip(
    text: string,
    x: number,
    y: number,
    o: { fg: RGB; bg: RGB; align?: 'left' | 'right' },
  ): number {
    const padX = 6
    const h = 13.5
    const size = 7.5
    const w = this.measure(text, { size, bold: true }) + padX * 2
    const left = o.align === 'right' ? x - w : x
    this.setFill(o.bg)
    this.doc.roundedRect(left, y, w, h, 3.5, 3.5, 'F')
    this.put(text, left + padX, y + 9.3, { size, bold: true, color: o.fg })
    return w
  }

  // --- Struktur-Bausteine ---

  /**
   * Berichtskopf: Markenzeile (Logo + Wortmarke, rechts das Datum), feine
   * Trennlinie, darunter Titel, Objekt und Umfang – alles auf der Fluchtlinie
   * der übrigen Seite.
   */
  masthead({ title, subtitle, meta, date }: MastheadOptions): void {
    const top = MARGIN_TOP
    const brandBase = top + 9

    this.drawLogo(MARGIN_X, brandBase - 11, 14, PALETTE.strong)
    this.eyebrow('E-App', MARGIN_X + 20, brandBase, PALETTE.strong, 8.5)
    if (date) {
      this.put(date, PAGE_W - MARGIN_X, brandBase, {
        size: 8,
        color: PALETTE.muted,
        align: 'right',
      })
    }

    const ruleY = top + 19
    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.8)
    this.doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY)

    let base = ruleY + 34
    this.put(title, MARGIN_X, base, { size: 24, bold: true, color: PALETTE.ink })
    if (subtitle) {
      base += 17
      this.put(subtitle, MARGIN_X, base, { size: 11, color: PALETTE.body })
    }
    if (meta) {
      base += 14
      this.eyebrow(meta, MARGIN_X, base, PALETTE.muted)
    }

    this.y = base + 14
  }

  /** Zeichnet das E-App-Logo: drei versetzte, schräge Balken (Parallelogramme). */
  private drawLogo(x: number, y: number, size: number, color: RGB = PALETTE.white): void {
    // Balken als Parallelogramm-Form (Anteile der Balkenbox), aus dem Original abgeleitet.
    const SHAPE: Array<[number, number]> = [
      [0, 0.7],
      [0.87, 0],
      [1, 0.08],
      [0.13, 0.78],
    ]
    // Position und Größe je Balken in Anteilen der Logo-Box (Treppen-Muster).
    const bars = [
      { bx: 0.19, by: 0.08, bw: 0.55, bh: 0.4 },
      { bx: 0.03, by: 0.41, bw: 0.53, bh: 0.38 },
      { bx: 0.41, by: 0.47, bw: 0.55, bh: 0.41 },
    ]
    this.setFill(color)
    for (const b of bars) {
      const p = SHAPE.map(
        ([fx, fy]) =>
          [x + (b.bx + fx * b.bw) * size, y + (b.by + fy * b.bh) * size] as [number, number],
      )
      // Parallelogramm aus zwei Dreiecken füllen.
      this.doc.triangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], 'F')
      this.doc.triangle(p[0][0], p[0][1], p[2][0], p[2][1], p[3][0], p[3][1], 'F')
    }
  }

  /**
   * Die Zusammenfassung über allen Abschnitten: getönte Fläche, Titel und die
   * Zahlen, wegen derer der Bericht geöffnet wird.
   *
   * Sie steht bewusst vor dem ersten Abschnitt und trägt keine Nummer – sie ist
   * kein Kapitel, sondern die Antwort. Ohne sie beginnt der Bericht mit dem
   * Uninteressantesten, das er zu bieten hat (Baujahr, Wohnfläche), und die
   * Zahlen, um die es geht, muss man sich aus drei Abschnitten zusammensuchen.
   */
  summaryPanel(title: string, stats: HeroStat[], note?: string): void {
    const list = stats.filter(Boolean)
    if (list.length === 0) return

    const pad = 16
    const cols = Math.min(list.length, 3)
    const rows = Math.ceil(list.length / cols)
    const colW = (CONTENT_W - pad * 2) / cols
    const hasSub = list.some((s) => s.sub)
    const rowH = hasSub ? 54 : 42
    const noteLines = note ? this.wrap(note, CONTENT_W - pad * 2, { size: 8.5 }) : []

    let panelH = pad + 14 + rows * rowH + pad - 6
    if (noteLines.length > 0) panelH += noteLines.length * 11.5 + 4

    this.ensure(panelH + 12)
    const top = this.y

    this.setFill(PALETTE.shade)
    this.doc.roundedRect(MARGIN_X, top, CONTENT_W, panelH, 12, 12, 'F')
    this.eyebrow(title, MARGIN_X + pad, top + pad + 2, PALETTE.muted)

    list.forEach((stat, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = MARGIN_X + pad + col * colW
      const base = top + pad + 14 + row * rowH

      // Trennstrich zwischen den Spalten statt Kachelrahmen: die Kennzahlen
      // gehören zusammen, sie sind nicht drei einzelne Karten.
      if (col > 0) {
        this.setDraw(PALETTE.rule)
        this.doc.setLineWidth(0.6)
        this.doc.line(x - 10, base + 2, x - 10, base + rowH - 14)
      }

      const innerW = colW - 16
      let size = 19
      while (size > 11 && this.measure(stat.value, { size, bold: true }) > innerW) size -= 0.5
      this.put(stat.value, x, base + 22, { size, bold: true, color: stat.color ?? PALETTE.ink })
      this.put(stat.label, x, base + 34, { size: 8, color: PALETTE.muted, maxWidth: innerW })
      if (stat.sub) {
        this.put(stat.sub, x, base + 45, { size: 7.5, color: PALETTE.faint, maxWidth: innerW })
      }
    })

    let ny = top + pad + 14 + rows * rowH - 4
    for (const line of noteLines) {
      ny += 11.5
      this.put(line, MARGIN_X + pad, ny, { size: 8.5, color: PALETTE.body })
    }

    this.y = top + panelH
  }

  /**
   * Abschnittstitel der obersten Ebene (Profil / Messungen / Monitoring):
   * kräftiger Titel über einer Haarlinie, die links von einem kurzen dunklen
   * Stück angeschnitten wird. `keepWith` hält den Titel mit dem Anfang seines
   * Inhalts zusammen – eine Überschrift als letzte Zeile einer Seite ist der
   * klassische Satzfehler.
   */
  sectionHeader(title: string, opts: { eyebrow?: string; keepWith?: number } = {}): void {
    if (!this.atPageTop) this.y += 20
    this.ensure(52 + (opts.keepWith ?? 40))

    let base = this.y + 9
    if (opts.eyebrow) {
      this.eyebrow(opts.eyebrow, MARGIN_X, base, PALETTE.muted)
      base += 15
    }
    this.put(title, MARGIN_X, base, { size: 15, bold: true, color: PALETTE.ink })

    const ruleY = base + 9
    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.8)
    this.doc.line(MARGIN_X, ruleY, PAGE_W - MARGIN_X, ruleY)
    this.setDraw(PALETTE.strong)
    this.doc.setLineWidth(1.6)
    this.doc.line(MARGIN_X, ruleY, MARGIN_X + 26, ruleY)

    this.y = ruleY + 18
  }

  /**
   * Gruppentitel innerhalb eines Abschnitts (Gewerk, „Übersicht"): versal,
   * gesperrt, ohne Linie. Die Linie bleibt der obersten Ebene vorbehalten –
   * sonst sähen beide Ebenen wieder gleich aus.
   */
  subHead(text: string, opts: { keepWith?: number } = {}): void {
    if (!this.atPageTop) this.y += 16
    this.ensure(24 + (opts.keepWith ?? 30))
    this.eyebrow(text, MARGIN_X, this.y + 8, PALETTE.body, 8.5)
    this.y += 17
  }

  /**
   * Kopf eines Energieträgers: Titel mit Farbpunkt des Trägers. Der Punkt
   * verbindet die Überschrift mit der Farbe der Balken darunter – ohne ihn
   * wäre die Diagrammfarbe reine Dekoration.
   */
  carrierHead(title: string, color: RGB, opts: { keepWith?: number } = {}): void {
    if (!this.atPageTop) this.y += 18
    this.ensure(30 + (opts.keepWith ?? 40))
    const base = this.y + 10
    this.setFill(color)
    this.doc.circle(MARGIN_X + 3.5, base - 3.5, 3.5, 'F')
    this.put(title, MARGIN_X + 14, base, { size: 12.5, bold: true, color: PALETTE.ink })
    this.y = base + 10
  }

  /**
   * Titel eines Diagramms samt optionalem erklärendem Untertitel.
   *
   * `keepWith` ist die Höhe des Diagramms darunter: Ohne sie prüft die
   * Überschrift nur ihren eigenen Platzbedarf und bleibt als letzte Zeile einer
   * Seite zurück, während das Diagramm allein auf der nächsten steht.
   */
  chartCaption(title: string, hint?: string, opts: { keepWith?: number } = {}): void {
    this.ensure((hint ? 30 : 18) + (opts.keepWith ?? 0))
    this.put(title, MARGIN_X, this.y + 8, { size: 9, bold: true, color: PALETTE.body })
    this.y += 12
    if (hint) {
      this.put(hint, MARGIN_X, this.y + 7, { size: 8, color: PALETTE.muted })
      this.y += 11
    }
  }

  /** Dezenter Hinweis-/Beschreibungstext (umbrechend). */
  subtle(text: string, opts: { indent?: number } = {}): void {
    const indent = opts.indent ?? 0
    for (const line of this.wrap(text, CONTENT_W - indent, { size: 8.5 })) {
      this.ensure(12)
      this.put(line, MARGIN_X + indent, this.y + 8, { size: 8.5, color: PALETTE.muted })
      this.y += 12
    }
  }

  // --- Kennzahlen ---

  /**
   * Kennzahl-Kacheln in Reihen mit `cols` Spalten: Bezeichnung oben klein,
   * Wert groß darunter. Die Bezeichnung steht bewusst zuerst – man liest sie,
   * um zu wissen, was die Zahl darunter bedeutet.
   */
  kpiCards(cards: KpiCard[], cols = 3): void {
    const list = cards.filter(Boolean)
    if (list.length === 0) return
    const gap = 10
    const hasSub = list.some((c) => c.sub)
    const cardH = hasSub ? 66 : 52

    for (let i = 0; i < list.length; i += cols) {
      const row = list.slice(i, i + cols)
      // Eine angebrochene letzte Reihe füllt die Breite aus. Kacheln in
      // Normalbreite mit einer Lücke rechts sehen nach abgeschnitten aus.
      const cardW = (CONTENT_W - gap * (row.length - 1)) / row.length
      this.ensure(cardH + gap)
      const top = this.y
      row.forEach((card, j) => {
        const x = MARGIN_X + j * (cardW + gap)
        const innerW = cardW - 24
        this.setFill(PALETTE.white)
        this.setDraw(PALETTE.hair)
        this.doc.setLineWidth(0.7)
        this.doc.roundedRect(x, top, cardW, cardH, 8, 8, 'FD')

        this.eyebrow(card.label, x + 12, top + 16, PALETTE.muted, 7)

        // Große Zahlen dürfen in der Kachel nicht umbrechen – lieber etwas
        // kleiner setzen als „14.390" auf zwei Zeilen.
        let size = 16
        while (size > 10.5 && this.measure(card.value, { size, bold: true }) > innerW) size -= 0.5
        this.put(card.value, x + 12, top + 38, {
          size,
          bold: true,
          color: card.color ?? PALETTE.ink,
        })

        if (card.sub) {
          this.put(card.sub, x + 12, top + 54, {
            size: 7.5,
            color: PALETTE.muted,
            maxWidth: innerW,
          })
        }
      })
      this.y = top + cardH + gap
    }
  }

  /**
   * Veränderung gegenüber der Vorperiode als Chip. `goodWhenDown` (Standard) →
   * sinkend = grün/gut, steigend = rot.
   */
  trendBadge(percentChange: number | undefined, label: string, opts: { goodWhenDown?: boolean } = {}): void {
    const { goodWhenDown = true } = opts
    this.ensure(20)
    if (percentChange === undefined || !Number.isFinite(percentChange)) {
      this.put(label, MARGIN_X, this.y + 10, { size: 8.5, color: PALETTE.muted })
      this.y += 18
      return
    }
    const rounded = Math.round(percentChange)
    const rising = rounded > 0
    const flat = rounded === 0
    const good = goodWhenDown ? !rising : rising
    const color = flat ? PALETTE.muted : good ? PALETTE.good : PALETTE.high
    const sign = flat ? '±' : rising ? '+' : '-'
    const w = this.chip(`${sign}${Math.abs(rounded)} %`, MARGIN_X, this.y, {
      fg: color,
      bg: tint(color, 0.88),
    })
    this.put(label, MARGIN_X + w + 8, this.y + 9.5, { size: 8.5, color: PALETTE.muted })
    this.y += 20
  }

  // --- Befunde ---

  /**
   * Ein Messergebnis als Karte: links Titel und Einordnung, rechts der Wert mit
   * Bewertungs-Chip darunter. Die Bewertungsfarbe erscheint nie ohne ihr Wort –
   * „gelb" und „orange" sind nebeneinander kaum zu unterscheiden, „Gut" und
   * „Auffällig" sehr wohl.
   */
  findingCard(card: FindingCard): void {
    const { pad, textX, leftW, innerW, metaH, summaryLines, tipLines, tipTop, cardH } =
      this.layoutFindingCard(card)
    const dotX = MARGIN_X + pad + 3.5
    const rightEdge = MARGIN_X + CONTENT_W - pad

    this.ensure(cardH + 8)
    const top = this.y

    this.setFill(PALETTE.white)
    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.7)
    this.doc.roundedRect(MARGIN_X, top, CONTENT_W, cardH, 9, 9, 'FD')

    this.setFill(card.color)
    this.doc.circle(dotX, top + 20.5, 3.5, 'F')
    this.put(card.title, textX, top + 24, {
      size: 10.5,
      bold: true,
      color: PALETTE.ink,
      maxWidth: leftW,
    })

    this.put(card.value, rightEdge, top + 24, {
      size: 12,
      bold: true,
      color: PALETTE.ink,
      align: 'right',
    })
    const ratingW = this.chip(card.ratingLabel, rightEdge, top + 33, {
      fg: card.color,
      bg: tint(card.color, 0.88),
      align: 'right',
    })
    if (card.noteLabel) {
      this.chip(card.noteLabel, rightEdge - ratingW - 5, top + 33, {
        fg: PALETTE.body,
        bg: PALETTE.shade,
        align: 'right',
      })
    }

    if (card.meta) {
      this.put(card.meta, textX, top + 35, { size: 7.5, color: PALETTE.muted, maxWidth: leftW })
    }

    let sy = top + 32 + metaH
    for (const line of summaryLines) {
      sy += 11.5
      this.put(line, textX, sy, { size: 8.5, color: PALETTE.muted })
    }

    if (tipLines.length > 0) {
      const boxTop = top + tipTop
      const boxH = 14 + tipLines.length * 11.5 + 4
      this.setFill(PALETTE.shade)
      this.doc.roundedRect(MARGIN_X + pad, boxTop, innerW, boxH, 6, 6, 'F')
      this.eyebrow(card.tipLabel ?? 'Tipp', MARGIN_X + pad + 10, boxTop + 12, PALETTE.muted, 7)
      let ty = boxTop + 14
      for (const line of tipLines) {
        ty += 11.5
        this.put(line, MARGIN_X + pad + 10, ty, { size: 8.5, color: PALETTE.body })
      }
    }

    this.y = top + cardH + 8
  }

  /**
   * Höhe einer Befund-Karte, ohne sie zu zeichnen. Damit kann ein Gruppentitel
   * verlangen, mit seinem ersten Befund zusammenzubleiben, statt mit einer
   * geschätzten Zahl – Karten sind je nach Text unterschiedlich hoch, und eine
   * Überschrift allein am Seitenende ist ein Satzfehler.
   */
  measureFindingCard(card: FindingCard): number {
    return this.layoutFindingCard(card).cardH
  }

  /** Gemeinsame Maßberechnung von {@link findingCard} und {@link measureFindingCard}. */
  private layoutFindingCard(card: FindingCard): {
    pad: number
    textX: number
    leftW: number
    innerW: number
    metaH: number
    summaryLines: string[]
    tipLines: string[]
    tipTop: number
    cardH: number
  } {
    const pad = 14
    const textX = MARGIN_X + pad + 14
    const leftW = CONTENT_W * 0.52 - pad
    const innerW = CONTENT_W - pad * 2

    const metaH = card.meta ? 11 : 0
    const summaryLines = card.summary ? this.wrap(card.summary, leftW, { size: 8.5 }) : []
    const tipLines = (card.tips ?? []).flatMap((tip) =>
      this.wrap(tip, innerW - 20, { size: 8.5 }),
    )

    // Höhe beider Spalten getrennt bestimmen, die höhere gewinnt. Die Chips
    // stehen nebeneinander, nicht gestapelt – gestapelt zwingen sie der Karte
    // eine Höhe auf, die die linke Spalte nicht füllt.
    let leftBottom = 28 + metaH
    if (summaryLines.length > 0) leftBottom += 4 + summaryLines.length * 11.5
    const rightBottom = 28 + 5 + 13.5
    let contentH = Math.max(leftBottom, rightBottom)
    const tipTop = contentH + 8
    if (tipLines.length > 0) contentH = tipTop + 14 + tipLines.length * 11.5 + 6

    return { pad, textX, leftW, innerW, metaH, summaryLines, tipLines, tipTop, cardH: contentH + pad }
  }

  /**
   * Checkliste offener Punkte in zwei Spalten. Ein leerer Kreis vor jedem
   * Eintrag sagt „noch offen", ohne dass es dastehen muss – und vier
   * Bindestriche untereinander sehen nach Notizzettel aus, nicht nach Bericht.
   */
  checklist(items: ChecklistItem[]): void {
    if (items.length === 0) return
    const cols = 2
    const gap = 16
    const colW = (CONTENT_W - gap) / cols
    const rowH = 21
    const rows = Math.ceil(items.length / cols)

    this.ensure(rows * rowH + 4)
    const top = this.y
    items.forEach((item, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = MARGIN_X + col * (colW + gap)
      const base = top + row * rowH + 13

      this.setDraw(PALETTE.rule)
      this.doc.setLineWidth(0.8)
      this.doc.circle(x + 4, base - 3.5, 3.6, 'S')

      const tagW = this.measure(item.tag, { size: 7.5, bold: true }) + 12
      this.put(item.title, x + 14, base, {
        size: 9.5,
        color: PALETTE.body,
        maxWidth: colW - 20 - tagW,
      })
      this.chip(item.tag, x + colW, base - 9.5, {
        fg: PALETTE.muted,
        bg: PALETTE.shade,
        align: 'right',
      })
    })
    this.y = top + rows * rowH + 4
  }

  // --- Tabellen ---

  /** Schlanke Label/Wert-Tabelle (zwei Spalten). */
  kvTable(rows: [string, string][]): void {
    const valid = rows.filter((r) => r && r[1] !== undefined)
    if (valid.length === 0) return
    const rowH = 20
    const valueX = MARGIN_X + CONTENT_W * 0.5
    valid.forEach(([label, value], i) => {
      this.ensure(rowH)
      this.put(label, MARGIN_X, this.y + 13, { size: 9.5, color: PALETTE.muted })
      this.put(value, valueX, this.y + 13, { size: 9.5, bold: true, color: PALETTE.ink })
      if (i < valid.length - 1) {
        this.setDraw(PALETTE.hair)
        this.doc.setLineWidth(0.5)
        this.doc.line(MARGIN_X, this.y + rowH, PAGE_W - MARGIN_X, this.y + rowH)
      }
      this.y += rowH
    })
    this.y += 6
  }

  /**
   * Mehrspaltige Tabelle mit Kopfzeile, optionaler Spaltenausrichtung und
   * optionalen Spaltenanteilen. Bricht die Kopfzeile auf Folgeseiten mit um.
   *
   * Der Kopf trägt keine Füllfläche, sondern versale Kleinschrift über einer
   * Linie – ein grauer Balken pro Tabelle macht die Seite unruhig.
   *
   * @param align je Spalte 'left' oder 'right' (Standard: alles links)
   * @param widths je Spalte ein Anteil an der Inhaltsbreite (Summe frei)
   * @param emphasizeLast letzte Zeile fett und abgesetzt – für Summenzeilen
   */
  table(
    headers: string[],
    rows: string[][],
    opts: { align?: ('left' | 'right')[]; widths?: number[]; emphasizeLast?: boolean } = {},
  ): void {
    if (rows.length === 0) return
    const cols = headers.length
    const { align = [], widths, emphasizeLast = false } = opts
    const rowH = TABLE_ROW_H
    const headH = TABLE_HEAD_H

    // Spaltenbreiten aus den Anteilen; ohne Angabe gleich breit.
    const share = widths && widths.length === cols ? widths : new Array(cols).fill(1)
    const total = share.reduce((a, b) => a + b, 0) || 1
    const colW = share.map((w) => (CONTENT_W * w) / total)
    const colX = colW.map((_, i) => MARGIN_X + colW.slice(0, i).reduce((a, b) => a + b, 0))

    // x-Position und Ausrichtung einer Zelle (rechtsbündig = Spaltenende).
    // Das Polster ist bewusst breiter als eine Haaresbreite: Endet eine
    // rechtsbündige Spalte direkt dort, wo die nächste linksbündig beginnt,
    // kleben „11,4 L/min" und „Auffällig" zu einem Wort zusammen.
    const cellPos = (i: number): { x: number; align: 'left' | 'right' } =>
      align[i] === 'right'
        ? { x: colX[i] + colW[i] - CELL_PAD, align: 'right' }
        : { x: colX[i] + CELL_PAD, align: 'left' }

    const drawHead = () => {
      headers.forEach((h, i) => {
        const { x, align: a } = cellPos(i)
        this.put(h.toUpperCase(), x, this.y + 9, {
          size: 7,
          bold: true,
          color: PALETTE.muted,
          align: a,
          track: 0.8,
        })
      })
      this.setDraw(PALETTE.rule)
      this.doc.setLineWidth(0.8)
      this.doc.line(MARGIN_X, this.y + headH, PAGE_W - MARGIN_X, this.y + headH)
      this.y += headH
    }

    // Kopfzeile plus zwei Datenzeilen zusammenhalten – eine einzelne Zeile am
    // Seitenende sieht nach Fehler aus.
    this.ensure(headH + rowH * 2)
    drawHead()
    rows.forEach((row, r) => {
      const isTotal = emphasizeLast && r === rows.length - 1
      this.ensure(rowH)
      if (this.atPageTop) drawHead()
      // Summenzeile durch eine kräftigere Linie darüber absetzen.
      if (isTotal) {
        this.setDraw(PALETTE.rule)
        this.doc.setLineWidth(0.8)
        this.doc.line(MARGIN_X, this.y, PAGE_W - MARGIN_X, this.y)
      }
      row.forEach((cell, i) => {
        const { x, align: a } = cellPos(i)
        this.put(cell, x, this.y + 12.5, {
          size: 8.5,
          bold: isTotal,
          color: isTotal ? PALETTE.ink : PALETTE.body,
          align: a,
          maxWidth: colW[i] - CELL_PAD * 2,
        })
      })
      if (!isTotal && r < rows.length - 1) {
        this.setDraw(PALETTE.hair)
        this.doc.setLineWidth(0.4)
        this.doc.line(MARGIN_X, this.y + rowH, PAGE_W - MARGIN_X, this.y + rowH)
      }
      this.y += rowH
    })
    this.y += 10
  }

  /**
   * Höhe einer Tabelle mit `rowCount` Zeilen, ohne sie zu zeichnen. Damit lässt
   * sich eine Tabelle mit dem zusammenhalten, wozu sie gehört.
   */
  measureTable(rowCount: number): number {
    return TABLE_HEAD_H + rowCount * TABLE_ROW_H + 6
  }

  /** Historien-Tabelle: Datum links, Zählerstand rechts. */
  historyTable(headers: string[], rows: string[][]): void {
    this.table(headers, rows, { align: ['left', 'right'] })
  }

  // --- Diagramme ---

  /**
   * Liniendiagramm (Vektor): Gitter, Linie, Punkte, x-Datumslabels, y-Marken.
   *
   * Die x-Achse ist eine echte Datumsachse – zwischen zwei Ablesungen liegt so
   * viel Platz, wie zwischen ihnen Zeit vergangen ist. Ein Mindestabstand hält
   * dicht aufeinander folgende Ablesungen trotzdem als eigene Punkte lesbar
   * (siehe `timeAxisPositions`).
   */
  lineChart(points: LinePoint[], opts: LineChartOptions = {}): void {
    const { height = 150, unit = '', color = PALETTE.ink, language, emptyNote } = opts
    const clean = points.filter((p) => Number.isFinite(p.value))

    // Achse an runden Zahlen ausrichten – „13.195" als Skalenmarke liest
    // niemand, „13.000" schon. Die Skala steht vor der Geometrie, weil die
    // Breite der Achsenrinne von der Breite ihrer Marken abhängt.
    const scale = niceScale(
      Math.min(...clean.map((p) => p.value)),
      Math.max(...clean.map((p) => p.value)),
      4,
    )
    const tickLabels = clean.length < 2 ? [] : scale.ticks.map((v) => formatTick(v, language))

    // Zu wenig Daten: ein Satz erklärt das. Eine leere graue Fläche in
    // Diagrammgröße sieht dagegen nach einem Fehler aus.
    if (clean.length < 2) {
      this.chartEmpty(emptyNote)
      return
    }

    this.ensure(height + 6)
    const { plotX, plotW, plotH, top, baseY } = this.chartFrame(height, unit, tickLabels)

    for (const tv of scale.ticks) {
      const gy = baseY - ((tv - scale.min) / scale.span) * plotH
      this.setDraw(PALETTE.hair)
      this.doc.setLineWidth(0.5)
      this.doc.line(plotX, gy, plotX + plotW, gy)
      this.put(formatTick(tv, language), plotX - 6, gy + 2.4, {
        size: 7,
        color: PALETTE.muted,
        align: 'right',
      })
    }

    // Punktdurchmesser (2 × 4.2 pt) plus etwas Luft – enger dürfen zwei
    // Ablesungen nicht zusammenrücken, sonst verschmelzen ihre Marker.
    const MIN_POINT_GAP = 11
    const offsets = timeAxisPositions(
      clean.map((p) => isoToTime(p.date)),
      plotW,
      MIN_POINT_GAP,
    )
    const sx = (i: number) => plotX + offsets[i]
    const sy = (v: number) => baseY - ((v - scale.min) / scale.span) * plotH

    this.setDraw(color)
    this.doc.setLineWidth(2)
    this.doc.setLineCap('round')
    this.doc.setLineJoin('round')
    for (let i = 1; i < clean.length; i++) {
      this.doc.line(sx(i - 1), sy(clean[i - 1].value), sx(i), sy(clean[i].value))
    }
    this.doc.setLineCap('butt')

    // Punkte mit weißem Ring – ohne ihn verschwimmen sie mit der Linie.
    for (let i = 0; i < clean.length; i++) {
      this.setFill(PALETTE.white)
      this.doc.circle(sx(i), sy(clean[i].value), 4.2, 'F')
      this.setFill(color)
      this.doc.circle(sx(i), sy(clean[i].value), 2.6, 'F')
    }

    // x-Datumslabels: erstes und letztes immer, dazwischen eines nahe der
    // Mitte. Weil die Punkte jetzt an ihrer echten Datumsposition sitzen, wird
    // das mittlere Label an seiner Position gewählt (nicht am Index) und nur
    // gesetzt, wenn es die Randlabels nicht berührt.
    const spansYear = dayDiff(clean[0].date, clean[clean.length - 1].date) > 300
    const labelW = spansYear ? 46 : 38
    const labelIdx = [0]
    if (clean.length > 2) {
      let mid = -1
      let bestDist = Infinity
      for (let i = 1; i < clean.length - 1; i++) {
        const dist = Math.abs(offsets[i] - plotW / 2)
        if (dist < bestDist) {
          bestDist = dist
          mid = i
        }
      }
      if (mid > 0 && offsets[mid] >= labelW && offsets[mid] <= plotW - labelW) labelIdx.push(mid)
    }
    labelIdx.push(clean.length - 1)
    for (const i of labelIdx) {
      const align = i === 0 ? 'left' : i === clean.length - 1 ? 'right' : 'center'
      this.put(formatAxisDate(clean[i].date, language, spansYear), sx(i), baseY + 13, {
        size: 7,
        color: PALETTE.muted,
        align,
      })
    }

    this.y = top + height
  }

  /**
   * Balkendiagramm über einer echten Zeitachse: jeder Balken deckt sein
   * Ablese-Intervall ab, seine Breite entspricht dessen Länge. Mit y-Achse ab
   * null, Gitterlinien, Datumsmarken und optionaler Bezugslinie – ohne Achse
   * wäre nur der höchste Balken ablesbar.
   *
   * Die Balken sind hell getönt und tragen oben eine kräftige Kappe. Vollflächig
   * gefärbt sind sie so viel Farbe, dass die Seite nur noch aus Balken besteht;
   * die Kappe hält den abzulesenden Wert trotzdem scharf.
   */
  intervalBarChart(
    bars: IntervalBar[],
    opts: {
      height?: number
      color?: RGB
      unit?: string
      language?: string
      reference?: ChartReference
      /** Satz, der statt des Diagramms steht, wenn es nichts zu zeichnen gibt. */
      emptyNote?: string
    } = {},
  ): void {
    const { height = 150, color = PALETTE.ink, unit = '', language, reference, emptyNote } = opts
    const clean = bars.filter((b) => Number.isFinite(b.value) && b.value >= 0)

    // Skala immer ab null – bei Verbrauchsmengen verzerrt ein abgeschnittener
    // Nullpunkt die Verhältnisse. Sie steht vor der Geometrie, weil die Breite
    // der Achsenrinne von der Breite ihrer Marken abhängt.
    const dataMax = Math.max(...clean.map((b) => b.value), reference?.value ?? 0)
    const scale = niceScale(0, dataMax > 0 ? dataMax : 1, 4)
    const max = scale.max
    const tickLabels = clean.length === 0 ? [] : scale.ticks.map((v) => formatTick(v, language))

    if (clean.length === 0) {
      this.chartEmpty(emptyNote)
      return
    }

    this.ensure(height + 6)
    const { plotX, plotW, plotH, top, baseY } = this.chartFrame(height, unit, tickLabels)

    for (const tv of scale.ticks) {
      const gy = baseY - (tv / max) * plotH
      this.setDraw(tv === 0 ? PALETTE.rule : PALETTE.hair)
      this.doc.setLineWidth(tv === 0 ? 0.8 : 0.5)
      this.doc.line(plotX, gy, plotX + plotW, gy)
      this.put(formatTick(tv, language), plotX - 6, gy + 2.4, {
        size: 7,
        color: PALETTE.muted,
        align: 'right',
      })
    }

    // Balkenbreiten aus den Intervalllängen – aber mit Sockel: rein
    // proportional verschwänden kurze Intervalle neben einem Jahresintervall zu
    // Strichen. Jeder Balken bekommt die Hälfte der Gleichverteilung sicher,
    // die andere Hälfte wird nach Länge verteilt.
    const spans = clean.map((b) => Math.max(1, dayDiff(b.from, b.to)))
    const totalSpan = spans.reduce((a, b) => a + b, 0)
    // Fester Abstand: das Weiß dazwischen trennt die Balken, nicht eine Kontur.
    const gap = clean.length > 1 ? 2 : 0
    const usable = plotW - gap * (clean.length - 1)
    const baseW = (usable * 0.5) / clean.length
    const flexW = usable * 0.5
    const wash = tint(color, 0.74)

    let x = plotX
    const marks: { x: number; date: string }[] = [{ x: plotX, date: clean[0].from }]
    clean.forEach((b, i) => {
      const w = baseW + (flexW * spans[i]) / totalSpan
      const h = (b.value / max) * plotH
      const barTop = baseY - h
      const capH = Math.min(2.5, Math.max(h, 0.8))
      this.setFill(wash)
      this.doc.rect(x, barTop, w, Math.max(h, 0.8), 'F')
      this.setFill(color)
      this.doc.rect(x, barTop, w, capH, 'F')
      x += w + gap
      marks.push({ x: Math.min(x - gap, plotX + plotW), date: b.to })
    })

    // Bezugslinie (gestrichelt) samt Beschriftung am rechten Rand.
    if (reference && reference.value > 0) {
      const ry = baseY - (reference.value / max) * plotH
      this.setDraw(PALETTE.body)
      this.doc.setLineWidth(0.7)
      this.doc.setLineDashPattern([2.5, 2.5], 0)
      this.doc.line(plotX, ry, plotX + plotW, ry)
      this.doc.setLineDashPattern([], 0)
      // Hinterlegen, sonst steht die Beschriftung auf einem Balken.
      const label = reference.label
      const lw = this.measure(label, { size: 7, bold: true })
      this.setFill(PALETTE.white)
      this.doc.roundedRect(plotX + plotW - lw - 8, ry - 12.5, lw + 8, 12, 3, 3, 'F')
      this.put(label, plotX + plotW - 4, ry - 4, {
        size: 7,
        bold: true,
        color: PALETTE.body,
        align: 'right',
      })
    }

    // Datumsmarken: nur so viele, wie ohne Überlappung lesbar bleiben.
    let lastLabelX = -Infinity
    marks.forEach((m, i) => {
      const isLast = i === marks.length - 1
      if (!isLast && m.x - lastLabelX < 48) return
      if (isLast && m.x - lastLabelX < 32) return
      const align = i === 0 ? 'left' : isLast ? 'right' : 'center'
      this.put(formatAxisDate(m.date, language, totalSpan > 300), m.x, baseY + 13, {
        size: 7,
        color: PALETTE.muted,
        align,
      })
      lastLabelX = m.x
    })

    this.y = top + height
  }

  /** Leerzustand eines Diagramms: nur der erklärende Satz, keine Platzhalterfläche. */
  private chartEmpty(note?: string): void {
    if (note) this.subtle(note)
    this.gap(2)
  }

  /**
   * Maße beider Diagrammtypen; zeichnet zugleich die Einheit über dem Plot.
   *
   * Die Achsenrinne ist so breit wie ihre breiteste Marke: fest gesetzt wäre
   * sie entweder zu eng für „16.000" oder verschenkte Platz neben „10".
   * Die Einheit steht in ihrem eigenen Kopfbereich – zu knapp bemessen stößt
   * die oberste Skalenmarke dagegen – und behält ihre Schreibweise: „kWh/Tag"
   * versal gesetzt wäre keine Einheit mehr.
   */
  private chartFrame(
    height: number,
    unit: string,
    tickLabels: string[],
  ): {
    plotX: number
    plotW: number
    plotH: number
    top: number
    plotTop: number
    baseY: number
  } {
    const top = this.y
    const widest = tickLabels.reduce((m, l) => Math.max(m, this.measure(l, { size: 7 })), 0)
    const gutter = Math.max(20, widest + 10)
    const headPad = unit ? 17 : 6
    const plotH = height - 22 - headPad
    const plotTop = top + headPad
    if (unit) {
      this.put(unit, MARGIN_X, top + 8, { size: 7.5, bold: true, color: PALETTE.muted })
    }
    return {
      plotX: MARGIN_X + gutter,
      plotW: CONTENT_W - gutter,
      plotH,
      top,
      plotTop,
      baseY: plotTop + plotH,
    }
  }

  /** Spacer in pt. */
  gap(dy = 8): void {
    this.y += dy
  }

  /**
   * Schreibt Seitenzahlen und Fußnote auf alle Seiten, ab Seite 2 zusätzlich
   * eine schlanke Kopfzeile. Ohne sie wäre eine einzeln ausgedruckte Folgeseite
   * keinem Objekt und keinem Bericht zuzuordnen.
   */
  finalizeFooters(
    pageLabel: (n: number, total: number) => string,
    footnote: string,
    runningHead?: { left: string; right: string },
  ): void {
    const total = this.doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p)

      this.setDraw(PALETTE.hair)
      this.doc.setLineWidth(0.6)
      this.doc.line(MARGIN_X, FOOTER_BASELINE - 12, PAGE_W - MARGIN_X, FOOTER_BASELINE - 12)

      this.drawLogo(MARGIN_X, FOOTER_BASELINE - 8, 9, PALETTE.faint)
      this.put(footnote, MARGIN_X + 14, FOOTER_BASELINE, { size: 7.5, color: PALETTE.muted })
      this.put(pageLabel(p, total), PAGE_W - MARGIN_X, FOOTER_BASELINE, {
        size: 7.5,
        color: PALETTE.muted,
        align: 'right',
      })

      if (p > 1 && runningHead) {
        const y = MARGIN_TOP - 26
        this.eyebrow(runningHead.left, MARGIN_X, y, PALETTE.muted, 7)
        this.put(runningHead.right, PAGE_W - MARGIN_X, y, {
          size: 7.5,
          color: PALETTE.faint,
          align: 'right',
        })
        this.setDraw(PALETTE.hair)
        this.doc.setLineWidth(0.6)
        this.doc.line(MARGIN_X, y + 7, PAGE_W - MARGIN_X, y + 7)
      }
    }
  }
}

// --- Formatierungs-Helfer (modul-lokal) ---

/**
 * Skala mit runden Marken. Marken wie „4,15" oder „13.195" entstehen, wenn man
 * den Wertebereich einfach halbiert – sie sind exakt, aber unlesbar. Hier wird
 * auf 1/2/2,5/5·10ⁿ gerundet, wie es Diagramme üblicherweise tun.
 */
function niceScale(
  lo: number,
  hi: number,
  targetTicks: number,
): { min: number; max: number; span: number; ticks: number[] } {
  let min = Math.min(lo, hi)
  let max = Math.max(lo, hi)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, span: 1, ticks: [0, 1] }
  if (min === max) {
    min -= 1
    max += 1
  }
  const step = niceStep((max - min) / Math.max(1, targetTicks - 1))
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  // Toleranz gegen Fließkomma-Reste, sonst fehlt die oberste Marke.
  for (let v = niceMin; v <= niceMax + step * 1e-6; v += step) ticks.push(round(v, step))
  return { min: niceMin, max: niceMax, span: niceMax - niceMin || 1, ticks }
}

/** Rundet eine Schrittweite auf 1, 2, 2,5 oder 5 mal eine Zehnerpotenz. */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  const frac = raw / exp
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10
  return nice * exp
}

/** Beseitigt Fließkomma-Reste (0,30000000000000004) auf Schrittweiten-Genauigkeit. */
function round(value: number, step: number): number {
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  return Number(value.toFixed(Math.min(10, digits)))
}

function formatTick(value: number, language?: string): string {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return new Intl.NumberFormat(language ?? 'de', { maximumFractionDigits: digits }).format(value)
}

/**
 * Datumsmarke der Zeitachse. Über mehr als ein Jahr hinweg wäre „25.04." nicht
 * eindeutig, deshalb kommt dort das Jahr dazu.
 */
function formatAxisDate(iso: string, language: string | undefined, withYear: boolean): string {
  if (!withYear) return formatDateShort(iso, language)
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat(language ?? 'de', { dateStyle: 'short' }).format(d)
}

/** Tagesabstand zwischen zwei ISO-Daten (für die Balkenbreiten). */
function dayDiff(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00`).getTime()
  const b = new Date(`${toIso}T00:00:00`).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1
  return Math.round((b - a) / 86_400_000)
}

function formatDateShort(iso: string, language?: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat(language ?? 'de', { day: '2-digit', month: '2-digit' }).format(d)
}
