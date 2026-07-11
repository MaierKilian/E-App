/**
 * Cloud Function: Zählerstand aus einem Foto lesen – via Google Gemini.
 *
 * Warum serverseitig? Der Gemini-API-Key darf NICHT in die öffentliche Web-App.
 * Diese aufrufbare (callable) Funktion hält den Key geheim (Firebase-Secret),
 * verlangt einen angemeldeten Nutzer und ruft Gemini nur serverseitig auf.
 *
 * Der Key wird als Secret `GEMINI_API_KEY` gesetzt (siehe docs/gemini-scan-setup.md).
 * Modell überschreibbar per Umgebungsvariable GEMINI_MODEL (Default: gemini-2.5-flash).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { setGlobalOptions } = require('firebase-functions/v2')

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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
    'Gib NUR den Hauptzählerstand zurück: die großen Ziffern des Hauptzählwerks.',
    'Bei mechanischen Zählern sind das die schwarzen Ganzzahl-Stellen VOR dem Komma;',
    'die roten Nachkommastellen NICHT mitzählen.',
    'Ignoriere Typenschild, Serien-/Modellnummern (z. B. „M14", „0102", „EN 1359:2007",',
    '„NG-4701BM"), Einheiten (m³, kWh) und jeglichen sonstigen Text.',
    unitLine,
    lastLine,
    'Wenn du die Ziffern nicht sicher lesen kannst, gib reading leer zurück.',
    'Antworte ausschließlich als JSON: {"reading":"<nur Ziffern>","confidence":"high|medium|low"}.',
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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let parsed = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = {}
    }
    const digits = String(parsed.reading ?? '').replace(/[^0-9]/g, '')
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
      ? parsed.confidence
      : 'low'

    return { digits, confidence }
  },
)
