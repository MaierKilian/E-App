import { jsPDF } from 'jspdf'

/**
 * Wiederverwendbares PDF-Design-Kit (jsPDF) für die E-App-Berichte.
 *
 * Alles arbeitet in Punkt (pt) auf A4. Der `PdfKit` kapselt den Cursor,
 * Seitenumbruch und ein kleines Set an grafischen Bausteinen (Kopfbalken,
 * Kennzahl-Kacheln, Linien-/Balkendiagramme als Vektor, Tabellen, Trend-Badge).
 *
 * Schrift: jsPDF-Standard (Helvetica, Latin-1). Unicode-Sonderzeichen werden
 * über {@link toLatin1} normalisiert, damit nichts als „Kästchen" erscheint.
 */

// --- A4-Geometrie in pt ---
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_X = 40
const MARGIN_TOP = 48
const MARGIN_BOTTOM = 44
const CONTENT_W = PAGE_W - MARGIN_X * 2

/** RGB-Farbtripel. */
export type RGB = [number, number, number]

/** Zentrale Palette (neutral + Akzent). Rating-Farben spiegeln measurements RATING_COLOR. */
export const PALETTE = {
  accent: [37, 99, 235] as RGB, // E-App-Blau (Akzent, neutral)
  ink: [24, 24, 27] as RGB,
  body: [55, 55, 60] as RGB,
  muted: [120, 122, 128] as RGB,
  hair: [224, 226, 230] as RGB,
  card: [244, 246, 249] as RGB,
  white: [255, 255, 255] as RGB,
  good: [22, 163, 74] as RGB, // RATING_COLOR.good
  medium: [217, 119, 6] as RGB, // RATING_COLOR.medium
  elevated: [234, 88, 12] as RGB, // RATING_COLOR.elevated
  high: [220, 38, 38] as RGB, // RATING_COLOR.high
}

/** Rating-Schlüssel → Palette-Farbe (spiegelt measurements/rating.ts). */
export function ratingColor(rating: 'good' | 'medium' | 'elevated' | 'high'): RGB {
  if (rating === 'good') return PALETTE.good
  if (rating === 'medium') return PALETTE.medium
  if (rating === 'elevated') return PALETTE.elevated
  return PALETTE.high
}

/**
 * Ersetzt gängige Unicode-Sonderzeichen durch Latin-1-feste Entsprechungen.
 * (Tiefstellungen ₀–₉, Pfeile, Anführungszeichen, Auf-/Abwärtspfeile …)
 */
export function toLatin1(input: string): string {
  if (!input) return ''
  const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'
  return input
    .replace(/[₀-₉]/g, (ch) => String(SUBSCRIPTS.indexOf(ch)))
    .replace(/[→➜➔]/g, '->')
    .replace(/[↑]/g, '+')
    .replace(/[↓]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[„“”‟]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[\u00A0\u2007\u202F\u2009\u2002\u2003]/g, " ")
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
}

/** Ein Balken für das Balkendiagramm. */
export interface BarItem {
  label: string
  value: number
}

/** Optionen für Kopfbalken. */
export interface HeaderBandOptions {
  title: string
  subtitle?: string
  date?: string
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

  private setColor(c: RGB): void {
    this.doc.setTextColor(c[0], c[1], c[2])
  }

  private setFill(c: RGB): void {
    this.doc.setFillColor(c[0], c[1], c[2])
  }

  private setDraw(c: RGB): void {
    this.doc.setDrawColor(c[0], c[1], c[2])
  }

  // --- Text-Bausteine ---

  /** Farbiger Kopfbalken mit E-App-Logo, Titel und Datum. */
  headerBand({ title, subtitle, date }: HeaderBandOptions): void {
    const h = 74
    this.setFill(PALETTE.accent)
    this.doc.rect(0, 0, PAGE_W, h, 'F')

    // Logo: drei versetzte, gerundete Balken (Vektor).
    this.drawLogo(MARGIN_X, 24, 26)

    const textX = MARGIN_X + 40
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(17)
    this.setColor(PALETTE.white)
    this.doc.text(toLatin1(title), textX, 36)

    if (subtitle) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9.5)
      this.setColor([224, 232, 255])
      this.doc.text(toLatin1(subtitle), textX, 52)
    }

    if (date) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9.5)
      this.setColor([224, 232, 255])
      this.doc.text(toLatin1(date), PAGE_W - MARGIN_X, 36, { align: 'right' })
    }

    this.y = h + 26
  }

  /** Zeichnet das E-App-Logo: drei versetzte, schräge Balken (Parallelogramme). */
  private drawLogo(x: number, y: number, size: number): void {
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
    this.setFill(PALETTE.white)
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

  /** Abschnittstitel mit dünner Trennlinie darunter. */
  sectionTitle(text: string): void {
    this.ensure(36)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(13)
    this.setColor(PALETTE.ink)
    this.doc.text(toLatin1(text), MARGIN_X, this.y)
    this.y += 7
    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.8)
    this.doc.line(MARGIN_X, this.y, PAGE_W - MARGIN_X, this.y)
    this.y += 16
  }

  /** Dezenter Hinweis-/Beschreibungstext (umbrechend). */
  subtle(text: string, opts: { indent?: number } = {}): void {
    const indent = opts.indent ?? 0
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9.5)
    this.setColor(PALETTE.muted)
    const lines = this.doc.splitTextToSize(toLatin1(text), CONTENT_W - indent) as string[]
    for (const line of lines) {
      this.ensure(13)
      this.doc.text(line, MARGIN_X + indent, this.y)
      this.y += 13
    }
  }

  /** Normaler Fließtext (umbrechend). */
  body(text: string, opts: { bold?: boolean; color?: RGB; indent?: number; size?: number } = {}): void {
    const { bold = false, color = PALETTE.body, indent = 0, size = 10 } = opts
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    this.setColor(color)
    const lines = this.doc.splitTextToSize(toLatin1(text), CONTENT_W - indent) as string[]
    for (const line of lines) {
      this.ensure(14)
      this.doc.text(line, MARGIN_X + indent, this.y)
      this.y += 14
    }
  }

  /** Kennzahl-Kacheln in Reihen mit `cols` Spalten. */
  kpiCards(cards: KpiCard[], cols = 3): void {
    const list = cards.filter(Boolean)
    if (list.length === 0) return
    const gap = 12
    const cardW = (CONTENT_W - gap * (cols - 1)) / cols
    const cardH = 58

    for (let i = 0; i < list.length; i += cols) {
      const row = list.slice(i, i + cols)
      this.ensure(cardH + gap)
      const top = this.y
      row.forEach((card, j) => {
        const x = MARGIN_X + j * (cardW + gap)
        this.setFill(PALETTE.card)
        this.doc.roundedRect(x, top, cardW, cardH, 10, 10, 'F')

        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(15)
        this.setColor(card.color ?? PALETTE.ink)
        this.doc.text(toLatin1(card.value), x + 12, top + 26, { maxWidth: cardW - 24 })

        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(8.5)
        this.setColor(PALETTE.muted)
        this.doc.text(toLatin1(card.label), x + 12, top + 40, { maxWidth: cardW - 24 })

        if (card.sub) {
          this.doc.setFontSize(8)
          this.setColor(PALETTE.muted)
          this.doc.text(toLatin1(card.sub), x + 12, top + 51, { maxWidth: cardW - 24 })
        }
      })
      this.y = top + cardH + gap
    }
  }

  /** Liniendiagramm (Vektor): Achsen, Linie, Punkte, x-Datumslabels, y min/max. */
  lineChart(points: LinePoint[], opts: LineChartOptions = {}): void {
    const { height = 150, unit = '', color = PALETTE.accent, language } = opts
    const clean = points.filter((p) => Number.isFinite(p.value))
    const plotX = MARGIN_X + 38
    const plotW = CONTENT_W - 38
    const labelArea = 28
    const plotH = height - labelArea

    this.ensure(height + 8)
    const top = this.y
    const baseY = top + plotH

    if (clean.length < 2) {
      this.setFill(PALETTE.card)
      this.doc.roundedRect(MARGIN_X, top, CONTENT_W, plotH, 8, 8, 'F')
      this.y = top + height
      return
    }

    let min = Math.min(...clean.map((p) => p.value))
    let max = Math.max(...clean.map((p) => p.value))
    if (min === max) {
      min -= 1
      max += 1
    }
    const range = max - min || 1

    // Gitter + y-Labels (min/mid/max).
    this.doc.setLineWidth(0.6)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7.5)
    const ticks = [max, (max + min) / 2, min]
    ticks.forEach((tv, idx) => {
      const gy = top + (plotH * idx) / 2
      this.setDraw(PALETTE.hair)
      this.doc.line(plotX, gy, plotX + plotW, gy)
      this.setColor(PALETTE.muted)
      this.doc.text(toLatin1(formatTick(tv, language)), plotX - 6, gy + 2.5, { align: 'right' })
    })

    const sx = (i: number) => plotX + (plotW * i) / (clean.length - 1)
    const sy = (v: number) => baseY - ((v - min) / range) * plotH

    // Linie.
    this.setDraw(color)
    this.doc.setLineWidth(1.6)
    for (let i = 1; i < clean.length; i++) {
      this.doc.line(sx(i - 1), sy(clean[i - 1].value), sx(i), sy(clean[i].value))
    }
    // Punkte.
    this.setFill(color)
    for (let i = 0; i < clean.length; i++) {
      this.doc.circle(sx(i), sy(clean[i].value), 2, 'F')
    }

    // x-Datumslabels (erst, mittig, letzt — vermeidet Überlappung).
    this.doc.setFontSize(7.5)
    this.setColor(PALETTE.muted)
    const labelIdx = clean.length <= 2 ? [0, clean.length - 1] : [0, Math.floor((clean.length - 1) / 2), clean.length - 1]
    const seen = new Set<number>()
    for (const i of labelIdx) {
      if (seen.has(i)) continue
      seen.add(i)
      const align = i === 0 ? 'left' : i === clean.length - 1 ? 'right' : 'center'
      this.doc.text(toLatin1(formatDateShort(clean[i].date, language)), sx(i), baseY + 14, {
        align: align as 'left' | 'center' | 'right',
      })
    }

    if (unit) {
      this.doc.setFontSize(7.5)
      this.setColor(PALETTE.muted)
      this.doc.text(toLatin1(unit), plotX, top - 4)
    }

    this.y = top + height
  }

  /** Balkendiagramm (Vektor) für Verbrauch je Intervall. */
  barChart(bars: BarItem[], opts: { height?: number; color?: RGB; language?: string } = {}): void {
    const { height = 130, color = PALETTE.accent, language } = opts
    const clean = bars.filter((b) => Number.isFinite(b.value) && b.value >= 0)
    const labelArea = 24
    const plotH = height - labelArea
    this.ensure(height + 6)
    const top = this.y
    const baseY = top + plotH

    if (clean.length === 0) {
      this.setFill(PALETTE.card)
      this.doc.roundedRect(MARGIN_X, top, CONTENT_W, plotH, 8, 8, 'F')
      this.y = top + height
      return
    }

    const max = Math.max(...clean.map((b) => b.value)) || 1
    const gap = 8
    const barW = Math.min(48, (CONTENT_W - gap * (clean.length - 1)) / clean.length)
    const totalW = barW * clean.length + gap * (clean.length - 1)
    const startX = MARGIN_X + (CONTENT_W - totalW) / 2

    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.6)
    this.doc.line(MARGIN_X, baseY, MARGIN_X + CONTENT_W, baseY)

    clean.forEach((b, i) => {
      const x = startX + i * (barW + gap)
      const h = (b.value / max) * plotH
      this.setFill(color)
      this.doc.roundedRect(x, baseY - h, barW, h, 3, 3, 'F')
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7)
      this.setColor(PALETTE.muted)
      this.doc.text(toLatin1(b.label), x + barW / 2, baseY + 12, { align: 'center', maxWidth: barW + gap })
    })

    if (language) void language
    this.y = top + height
  }

  /**
   * Trend-Badge: Pfeil + farbiger Wert.
   * `goodWhenDown` (Standard) → sinkend = grün/gut, steigend = rot.
   */
  trendBadge(percentChange: number | undefined, label: string, opts: { goodWhenDown?: boolean } = {}): void {
    const { goodWhenDown = true } = opts
    this.ensure(18)
    if (percentChange === undefined || !Number.isFinite(percentChange)) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9)
      this.setColor(PALETTE.muted)
      this.doc.text(toLatin1(label), MARGIN_X, this.y + 9)
      this.y += 16
      return
    }
    const rounded = Math.round(percentChange)
    const rising = rounded > 0
    const flat = rounded === 0
    const good = goodWhenDown ? !rising : rising
    const color = flat ? PALETTE.muted : good ? PALETTE.good : PALETTE.high
    const arrow = flat ? '=' : rising ? '+' : '-'
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(9.5)
    this.setColor(color)
    const txt = `${arrow} ${Math.abs(rounded)}%`
    this.doc.text(toLatin1(txt), MARGIN_X, this.y + 9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.setColor(PALETTE.muted)
    this.doc.text(toLatin1(label), MARGIN_X + 52, this.y + 9)
    this.y += 17
  }

  /** Schlanke Label/Wert-Tabelle (zwei Spalten). */
  kvTable(rows: [string, string][]): void {
    const valid = rows.filter((r) => r && r[1] !== undefined)
    if (valid.length === 0) return
    const rowH = 18
    const labelW = CONTENT_W * 0.55
    for (const [label, value] of valid) {
      this.ensure(rowH)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9.5)
      this.setColor(PALETTE.muted)
      this.doc.text(toLatin1(label), MARGIN_X, this.y + 12)
      this.doc.setFont('helvetica', 'bold')
      this.setColor(PALETTE.ink)
      this.doc.text(toLatin1(value), MARGIN_X + labelW, this.y + 12)
      this.setDraw(PALETTE.hair)
      this.doc.setLineWidth(0.5)
      this.doc.line(MARGIN_X, this.y + rowH, PAGE_W - MARGIN_X, this.y + rowH)
      this.y += rowH
    }
    this.y += 6
  }

  /** Mehrspaltige Historien-Tabelle mit Kopfzeile. */
  historyTable(headers: string[], rows: string[][]): void {
    if (rows.length === 0) return
    const cols = headers.length
    const colW = CONTENT_W / cols
    const rowH = 16

    const drawHead = () => {
      this.setFill(PALETTE.card)
      this.doc.roundedRect(MARGIN_X, this.y, CONTENT_W, rowH, 4, 4, 'F')
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.5)
      this.setColor(PALETTE.body)
      headers.forEach((h, i) => {
        this.doc.text(toLatin1(h), MARGIN_X + i * colW + 6, this.y + 11)
      })
      this.y += rowH + 2
    }

    this.ensure(rowH * 2)
    drawHead()
    for (const row of rows) {
      this.ensure(rowH + 2)
      if (this.y === MARGIN_TOP) drawHead()
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.5)
      this.setColor(PALETTE.body)
      row.forEach((cell, i) => {
        this.doc.text(toLatin1(cell), MARGIN_X + i * colW + 6, this.y + 10)
      })
      this.setDraw(PALETTE.hair)
      this.doc.setLineWidth(0.4)
      this.doc.line(MARGIN_X, this.y + rowH, PAGE_W - MARGIN_X, this.y + rowH)
      this.y += rowH
    }
    this.y += 8
  }

  /** Listenzeile mit farbigem Punkt (z. B. Rating), Titel und rechtem Wert. */
  swatchRow(color: RGB, title: string, value: string, opts: { tag?: string } = {}): void {
    const rowH = 20
    this.ensure(rowH)
    this.setFill(color)
    this.doc.circle(MARGIN_X + 4, this.y + 9, 3.2, 'F')
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    this.setColor(PALETTE.ink)
    this.doc.text(toLatin1(title), MARGIN_X + 14, this.y + 12, { maxWidth: CONTENT_W * 0.6 })
    this.doc.setFont('helvetica', 'bold')
    this.setColor(PALETTE.ink)
    this.doc.text(toLatin1(value), PAGE_W - MARGIN_X, this.y + 12, { align: 'right' })
    if (opts.tag) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8)
      this.setColor(color)
      this.doc.text(toLatin1(opts.tag), PAGE_W - MARGIN_X, this.y + 12 - 11, { align: 'right' })
    }
    this.setDraw(PALETTE.hair)
    this.doc.setLineWidth(0.4)
    this.doc.line(MARGIN_X + 14, this.y + rowH, PAGE_W - MARGIN_X, this.y + rowH)
    this.y += rowH
  }

  /** Spacer in pt. */
  gap(dy = 8): void {
    this.y += dy
  }

  /** Schreibt Seitenzahlen + Fußnote auf alle Seiten. */
  finalizeFooters(pageLabel: (n: number, total: number) => string, footnote: string): void {
    const total = this.doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8)
      this.doc.setTextColor(PALETTE.muted[0], PALETTE.muted[1], PALETTE.muted[2])
      this.doc.text(toLatin1(footnote), MARGIN_X, PAGE_H - 22)
      this.doc.text(toLatin1(pageLabel(p, total)), PAGE_W - MARGIN_X, PAGE_H - 22, { align: 'right' })
    }
  }

  /** Speichert das Dokument unter `name` (löst den Download aus). */
  save(name: string): void {
    this.doc.save(name)
  }
}

// --- Formatierungs-Helfer (modul-lokal) ---

function formatTick(value: number, language?: string): string {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return new Intl.NumberFormat(language ?? 'de', { maximumFractionDigits: digits }).format(value)
}

function formatDateShort(iso: string, language?: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat(language ?? 'de', { day: '2-digit', month: '2-digit' }).format(d)
}
