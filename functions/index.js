/**
 * Cloud Function: Zählerstand aus einem Foto lesen – via Google Gemini.
 *
 * Warum serverseitig? Der Gemini-API-Key darf NICHT in die öffentliche Web-App.
 * Diese aufrufbare (callable) Funktion hält den Key geheim (Firebase-Secret),
 * verlangt einen angemeldeten Nutzer und ruft Gemini nur serverseitig auf.
 *
 * Der Key wird als Secret `GEMINI_API_KEY` gesetzt (siehe docs/gemini-scan-setup.md).
 * Modell überschreibbar per Umgebungsvariable GEMINI_MODEL (Default: gemini-flash-latest).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { setGlobalOptions } = require('firebase-functions/v2')

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
// `gemini-flash-latest` ist ein von Google gepflegter Alias auf das jeweils
// aktuelle Flash-Modell. Feste Versionen (z. B. gemini-2.5-flash) werden für
// neue Projekte teils gesperrt ("no longer available to new users") – der Alias
// bleibt dagegen gültig. Bei Bedarf per GEMINI_MODEL überschreibbar.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

// Nah an Deutschland; günstiger Zuschnitt.
setGlobalOptions({ region: 'europe-west1' })

/** Baut die Anweisung an Gemini – bewusst eng auf den Hauptzählerstand. */
function buildPrompt(unit, lastReading) {
  const unitLine = unit ? `Einheit dieses Zählers: ${unit}.` : ''
  const lastLine =
    Number.isFinite(lastReading) && lastReading > 0
      ? `Letzter bekannter Stand: ${lastReading} (nur als grober Plausibilitäts-Hinweis, NICHT einfach übernehmen).`
      : ''
  return [
    'Du liest einen Haushalts-Zähler (Gas, Strom oder Wasser) von einem Foto ab.',
    'Lies das Hauptzählwerk ab und gib zwei Werte zurück:',
    '1) reading = die schwarzen Ganzzahl-Stellen VOR dem Komma (führende Nullen dürfen dabei sein).',
    '2) firstDecimal = NUR die ERSTE Nachkommastelle NACH dem Komma (die erste rote Ziffer) – also genau eine Ziffer.',
    'Bei mechanischen Zählern sind die Vorkomma-Stellen schwarz, die Nachkommastellen rot.',
    'Weitere rote Nachkommastellen NICHT zurückgeben – ausschließlich die erste.',
    'Ignoriere Typenschild, Serien-/Modellnummern (z. B. „M14", „0102", „EN 1359:2007",',
    '„NG-4701BM"), Einheiten (m³, kWh) und jeglichen sonstigen Text.',
    unitLine,
    lastLine,
    'Wenn du die Vorkomma-Ziffern nicht sicher lesen kannst, gib reading leer zurück.',
    'Wenn die erste Nachkommastelle nicht sicher lesbar ist, gib firstDecimal leer zurück.',
    'Antworte ausschließlich als JSON: {"reading":"<Ziffern>","firstDecimal":"<eine Ziffer oder leer>","confidence":"high|medium|low"}.',
  ]
    .filter(Boolean)
    .join(' ')
}

exports.scanMeter = onCall(
  {
    secrets: [GEMINI_API_KEY],
    memory: '256MiB',
    timeoutSeconds: 30,
    // Kleine Freimengen reichen; hartes Limit gegen Kostenüberraschungen.
    maxInstances: 5,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.')
    }
    const { imageBase64, unit, lastReading } = request.data || {}
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      throw new HttpsError('invalid-argument', 'imageBase64 fehlt oder ist ungültig.')
    }
    // ~8 MB Base64 als grobe Obergrenze (Missbrauch/Kosten bremsen).
    if (imageBase64.length > 8_000_000) {
      throw new HttpsError('invalid-argument', 'Bild ist zu groß.')
    }

    const body = {
      contents: [
        {
          parts: [
            { text: buildPrompt(unit, Number(lastReading)) },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reading: { type: 'STRING' },
            firstDecimal: { type: 'STRING' },
            confidence: { type: 'STRING' },
          },
          required: ['reading', 'confidence'],
        },
      },
    }

    let resp
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
    } catch (err) {
      throw new HttpsError('unavailable', 'Gemini nicht erreichbar.')
    }

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('Gemini-Fehler', resp.status, detail.slice(0, 500))
      // 429 = Kontingent/Rate-Limit erschöpft.
      if (resp.status === 429) throw new HttpsError('resource-exhausted', 'Kontingent erschöpft.')
      throw new HttpsError('internal', `Gemini-Fehler (${resp.status}).`)
    }

    const data = await resp.json()

    // Token-Verbrauch dieses einen Scans protokollieren (im Logs Explorer
    // nach "Gemini-Tokens" filtern). promptTokenCount enthält Text + Bild.
    const usage = data?.usageMetadata
    if (usage) {
      console.log(
        'Gemini-Tokens',
        JSON.stringify({
          prompt: usage.promptTokenCount,
          output: usage.candidatesTokenCount,
          total: usage.totalTokenCount,
        }),
      )
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let parsed = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = {}
    }
    // Vorkomma-Stellen (schwarz) und die erste Nachkommastelle (erste rote Ziffer).
    const intDigits = String(parsed.reading ?? '').replace(/[^0-9]/g, '')
    const decDigit = String(parsed.firstDecimal ?? '').replace(/[^0-9]/g, '').slice(0, 1)
    // Führende Nullen entfernen, aber mindestens eine Ziffer behalten: 07356 → 7356.
    const intTrimmed = intDigits.replace(/^0+(?=\d)/, '')
    // Mit erster Nachkommastelle und deutschem Komma, falls beides vorhanden: 7356,4.
    const digits = intTrimmed && decDigit ? `${intTrimmed},${decDigit}` : intTrimmed
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
      ? parsed.confidence
      : 'low'

    return { digits, confidence }
  },
)

// ---------------------------------------------------------------------------
// Feedback-Benachrichtigung: Mail bei jedem neuen Nutzer-Feedback.
//
// Warum überhaupt? Ohne Benachrichtigung schaut niemand in die Firestore-
// Console, und der Kanal verrottet still (docs/feedback-concept.md, §8).
//
// Eine Mail pro Feedback – bei den ersten Nutzern ist das Volumen klein und die
// schnelle Reaktion wertvoll. Ab spürbarem Volumen auf einen Tages-Digest
// umstellen.
// ---------------------------------------------------------------------------

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')

const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

/**
 * Empfänger und Absender – per Umgebungsvariable überschreibbar.
 *
 * Der Empfänger MUSS die Adresse des Resend-Kontos sein, solange als Absender
 * `onboarding@resend.dev` dient: Ohne eigene verifizierte Domain lässt Resend
 * nur Mails an den Kontoinhaber zu und lehnt alles andere mit 403 ab.
 * Erst nach dem Verifizieren einer eigenen Domain lässt sich hier eine
 * beliebige Adresse eintragen.
 */
const FEEDBACK_MAIL_TO = process.env.FEEDBACK_MAIL_TO || 'eapp.admin@gmail.com'
const FEEDBACK_MAIL_FROM = process.env.FEEDBACK_MAIL_FROM || 'E-App Feedback <onboarding@resend.dev>'

/** Obergrenze pro Tag – schützt das Postfach, falls jemand das Formular flutet. */
const MAX_MAILS_PER_DAY = 50

const SENTIMENT_LABEL = { bad: '☹️ negativ', neutral: '😐 neutral', good: '🙂 positiv' }
const CATEGORY_LABEL = { bug: 'Fehler', idea: 'Idee', other: 'Sonstiges' }

admin.initializeApp()

/**
 * Zählt die heute verschickten Mails hoch und meldet, ob noch Platz ist.
 *
 * Der Zähler liegt in Firestore (`feedbackMeta/mailQuota`), nicht im
 * Arbeitsspeicher: Cloud Functions laufen in mehreren Instanzen, ein lokaler
 * Zähler würde die Grenze pro Instanz statt insgesamt ziehen.
 */
async function claimMailQuota() {
  const today = new Date().toISOString().slice(0, 10)
  const ref = admin.firestore().doc('feedbackMeta/mailQuota')
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() : {}
    const count = data.date === today ? data.count || 0 : 0
    if (count >= MAX_MAILS_PER_DAY) return false
    tx.set(ref, { date: today, count: count + 1 })
    return true
  })
}

/** Baut den Mailtext: Freitext zuerst, Kontext darunter. */
function buildMailBody(data, feedbackId) {
  const context = [
    // Ganz nach oben: Wer geantwortet werden darf, ist die wichtigste
    // Handlungsanweisung der ganzen Mail.
    ['Rückfragen erlaubt', data.contactOk ? `JA → ${data.contactEmail || 'ohne Adresse'}` : 'nein'],
    ['Seite', data.route],
    ['Version', data.appVersion],
    ['Sprache', data.language],
    ['Design', data.theme],
    ['Gerät', data.viewport],
    ['Angemeldet', data.isGuest ? 'nein (Gast)' : 'ja'],
    ['Demo-Modus', data.demoMode ? 'ja' : 'nein'],
    ['Ausgelöst über', data.source],
    ['User-Agent', data.userAgent],
    ['Dokument', feedbackId],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')

  const text = String(data.text || '').trim()
  return `${text || '(kein Freitext)'}\n\n---\n${context}\n`
}

exports.onFeedbackCreated = onDocumentCreated(
  {
    document: 'feedback/{feedbackId}',
    secrets: [RESEND_API_KEY],
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 3,
    // Ein fehlgeschlagener Mailversand darf NICHT endlos wiederholt werden –
    // das Feedback liegt ohnehin sicher in Firestore.
    retry: false,
  },
  async (event) => {
    const data = event.data && event.data.data()
    if (!data) return

    const apiKey = RESEND_API_KEY.value()
    if (!apiKey) {
      logger.warn('RESEND_API_KEY fehlt – Feedback gespeichert, aber keine Mail verschickt.')
      return
    }

    if (!(await claimMailQuota())) {
      logger.warn(`Tageslimit von ${MAX_MAILS_PER_DAY} Feedback-Mails erreicht – nur protokolliert.`)
      return
    }

    const sentiment = SENTIMENT_LABEL[data.sentiment] || data.sentiment || '–'
    const category = CATEGORY_LABEL[data.category] || 'ohne Einordnung'
    // Ein „✉" im Betreff macht die Feedbacks sichtbar, bei denen sich eine
    // Antwort lohnt – ohne die Mail öffnen zu müssen.
    const reply = data.contactOk ? '✉ ' : ''
    const subject = `[E-App] ${reply}${sentiment} · ${category} · ${data.route || '/'}`

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FEEDBACK_MAIL_FROM,
          to: [FEEDBACK_MAIL_TO],
          subject,
          text: buildMailBody(data, event.params.feedbackId),
        }),
      })
      if (!response.ok) {
        logger.error('Resend hat den Versand abgelehnt', {
          status: response.status,
          body: await response.text(),
        })
      }
    } catch (error) {
      logger.error('Feedback-Mail konnte nicht verschickt werden', error)
    }
  },
)
