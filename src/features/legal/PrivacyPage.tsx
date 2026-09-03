import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalValue } from './LegalPage'
import { OPERATOR, addressLines } from './operator'
import { useConsentStore, useAnalyticsConsent } from './consent'

/**
 * Datenschutzerklärung nach Art. 13 DSGVO.
 *
 * Inhaltlich bewusst eng am tatsächlichen Verhalten der App gehalten – jeder
 * Abschnitt entspricht einer real vorhandenen Verarbeitung im Code:
 *   Hosting            → Firebase Hosting / GitHub Pages
 *   Lokale Speicherung → zustand/persist (localStorage), Firestore-Offline-Cache
 *   Konto              → Firebase Authentication (`lib/firebase.ts`)
 *   Wohnungsdaten      → Cloud Firestore (`features/sync/cloudSync.ts`)
 *   Zählerstand-Scan   → Cloud Function `scanMeter` (Gemini) + Tesseract.js
 *   Rückmeldungen      → `features/feedback/submitFeedback.ts`
 *   Nutzungsstatistik  → Google Analytics, nur nach Einwilligung
 *
 * Wird eine dieser Verarbeitungen geändert oder kommt eine hinzu, gehört sie
 * hierher – und `CONSENT_VERSION` muss hoch, wenn sie einwilligungsbedürftig
 * ist.
 */
export function PrivacyPage() {
  const { t } = useTranslation()
  const openSettings = useConsentStore((s) => s.openSettings)
  const analyticsGranted = useAnalyticsConsent()

  return (
    <LegalPage
      title="Datenschutzerklärung"
      intro="Informationen zur Verarbeitung personenbezogener Daten nach Art. 13 DSGVO"
    >
      <LegalSection title="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung im Sinne des Art. 4 Nr. 7
          DSGVO ist:
        </p>
        <p>
          <LegalValue value={OPERATOR.name} hint="Name noch einzutragen" />
          {addressLines().map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {OPERATOR.email && (
            <a
              href={`mailto:${OPERATOR.email}`}
              className="focus-ring mt-1 block rounded font-medium text-foreground underline underline-offset-2"
            >
              {OPERATOR.email}
            </a>
          )}
        </p>
        <p>
          Die vollständigen Anbieterangaben stehen im{' '}
          <Link
            to="/impressum"
            className="focus-ring rounded font-medium text-foreground underline underline-offset-2"
          >
            Impressum
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Grundgedanke: so wenig Daten wie möglich">
        <p>
          E-App ist als lokale Anwendung gebaut. Deine Angaben zur Wohnung, deine
          Messergebnisse und deine Zählerstände bleiben zunächst ausschließlich in
          deinem Browser. Erst wenn du dich anmeldest, werden sie zusätzlich in
          deinem Konto gespeichert, damit du sie auf mehreren Geräten und
          gemeinsam mit deinem Haushalt nutzen kannst. Ohne Anmeldung verlässt
          außer den unten genannten Ausnahmen (Zählerstand-Scan, Rückmeldung,
          Nutzungsstatistik) nichts dein Gerät.
        </p>
      </LegalSection>

      <LegalSection title="3. Aufruf der Anwendung (Hosting und Server-Logs)">
        <p>
          Die Anwendung wird über <strong>Firebase Hosting</strong> (Google
          Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland)
          ausgeliefert; eine zweite Fassung liegt auf{' '}
          <strong>GitHub Pages</strong> (GitHub B.V., Vijzelstraat 68–72, 1017 HL
          Amsterdam, Niederlande).
        </p>
        <p>
          Beim Aufruf überträgt dein Browser technisch notwendige Daten an den
          Server: IP-Adresse, Datum und Uhrzeit, angeforderte Datei,
          übertragene Datenmenge, Browsertyp und Betriebssystem. Diese Daten
          werden vom jeweiligen Anbieter in Server-Protokollen verarbeitet, um
          die Auslieferung technisch zu ermöglichen und die Sicherheit zu
          gewährleisten.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes
          Interesse liegt in der zuverlässigen und sicheren Bereitstellung der
          Anwendung.
        </p>
      </LegalSection>

      <LegalSection title="4. Speicherung auf deinem Endgerät">
        <p>
          Die Anwendung speichert Informationen im lokalen Speicher deines
          Browsers (<code className="rounded bg-surface-2 px-1 text-[0.85em]">localStorage</code>{' '}
          und <code className="rounded bg-surface-2 px-1 text-[0.85em]">IndexedDB</code>). Diese
          Speicherung ist unbedingt erforderlich, damit die von dir angeforderte
          Anwendung überhaupt funktioniert; sie ist deshalb nach § 25 Abs. 2 Nr. 2
          TDDDG einwilligungsfrei.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Wohnungsprofil, Messungen, Zählerstände, Tarife, Lernfortschritt</strong>{' '}
            – deine Eingaben, damit sie beim nächsten Aufruf noch da sind.
          </li>
          <li>
            <strong>Darstellung und Sprache</strong> – Farbschema und
            Sprachauswahl.
          </li>
          <li>
            <strong>Einwilligung</strong> – deine Entscheidung zur
            Nutzungsstatistik samt Zeitpunkt (Nachweis nach Art. 7 Abs. 1 DSGVO).
          </li>
          <li>
            <strong>Anmeldung</strong> – ein Sitzungstoken von Firebase
            Authentication, sobald du dich anmeldest.
          </li>
          <li>
            <strong>Offline-Cache</strong> – eine lokale Kopie deiner
            Cloud-Daten, damit die App auch bei schlechter Verbindung nutzbar
            bleibt.
          </li>
        </ul>
        <p>
          Diese Daten kannst du jederzeit über{' '}
          <em>Einstellungen → Daten → Alle Daten löschen</em> oder über die
          Website-Einstellungen deines Browsers entfernen.
        </p>
      </LegalSection>

      <LegalSection title="5. Konto und Anmeldung">
        <p>
          Für die geräteübergreifende Nutzung kannst du dich mit einem
          Google-Konto anmelden. Die Anmeldung wickelt{' '}
          <strong>Firebase Authentication</strong> (Google Ireland Limited) ab.
          Dabei werden deine E-Mail-Adresse, dein Anzeigename, dein Profilbild
          (sofern vorhanden) und eine technische Nutzerkennung verarbeitet.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO – die Verarbeitung ist
          zur Erfüllung des von dir gewünschten Nutzungsverhältnisses
          erforderlich. Die Nutzung ohne Konto ist möglich; dann bleiben deine
          Daten ausschließlich lokal.
        </p>
      </LegalSection>

      <LegalSection title="6. Speicherung deiner Daten im Konto">
        <p>
          Bist du angemeldet, werden dein Wohnungsprofil, deine Messergebnisse,
          Zählerstände, Tarife und Einstellungen in <strong>Cloud Firestore</strong>{' '}
          (Google Ireland Limited) gespeichert. Der Datenbank-Standort ist{' '}
          <code className="rounded bg-surface-2 px-1 text-[0.85em]">eur3 (europe-west)</code>,
          die Daten liegen damit in der Europäischen Union.
        </p>
        <p>
          Wenn du ein Wohnprofil per Einladungslink teilst, können die
          eingeladenen Personen die Daten dieses Profils sehen und bearbeiten.
          Das ist der Zweck der Funktion – teile den Link deshalb nur mit
          Menschen, denen du diesen Zugriff geben willst.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </LegalSection>

      <LegalSection title="7. Zählerstand per Foto erfassen">
        <p>
          Beim Scannen eines Zählerstands wird das aufgenommene Bild an eine von
          uns betriebene Cloud Function (Region{' '}
          <code className="rounded bg-surface-2 px-1 text-[0.85em]">europe-west1</code>)
          gesendet und von dort zur Ziffernerkennung an die{' '}
          <strong>Gemini-API von Google</strong> übermittelt. Das Bild wird nicht
          dauerhaft bei uns gespeichert; übernommen wird nur die erkannte Zahl,
          die du anschließend bestätigst oder korrigierst.
        </p>
        <p>
          Fotografiere ausschließlich das Zählwerk. Personen, Dokumente oder
          andere personenbezogene Inhalte gehören nicht ins Bild.
        </p>
        <p>
          Schlägt die Erkennung fehl, greift ersatzweise eine Texterkennung, die
          vollständig in deinem Browser läuft (Tesseract.js). Das Bild verlässt
          dabei dein Gerät nicht; für die Erkennung lädt der Browser allerdings
          einmalig Programm- und Sprachdateien von einem Content-Delivery-Netz
          (jsDelivr sowie tessdata.projectnaptha.com), wobei deine IP-Adresse an
          den jeweiligen Anbieter übertragen wird.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; die Verarbeitung findet
          nur statt, wenn du die Funktion aktiv auslöst.
        </p>
      </LegalSection>

      <LegalSection title="8. Rückmeldungen">
        <p>
          Sendest du uns über die Feedback-Funktion eine Rückmeldung, speichern
          wir deinen Text, die gewählte Stimmung und Kategorie, die Seite, von
          der aus du geschrieben hast, die App-Version sowie – nur wenn du das
          ausdrücklich zulässt – ein Bildschirmfoto des Moments und deine
          E-Mail-Adresse für eine Rückfrage. Die Daten liegen in Cloud Firestore
          und werden ausschließlich zur Verbesserung der Anwendung und für die
          Beantwortung deiner Rückmeldung genutzt.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (deine Einwilligung
          durch das Absenden) bzw. Art. 6 Abs. 1 lit. f DSGVO an der
          Verbesserung der Anwendung.
        </p>
      </LegalSection>

      <LegalSection title="9. Anonyme Nutzungsstatistik (Google Analytics)">
        <p>
          Mit deiner Einwilligung nutzen wir <strong>Google Analytics 4</strong>{' '}
          (Google Ireland Limited), um zu verstehen, welche Bereiche der App
          genutzt werden und wo Nutzer abbrechen. Dabei werden Informationen auf
          deinem Endgerät gespeichert (Cookies mit den Namen{' '}
          <code className="rounded bg-surface-2 px-1 text-[0.85em]">_ga</code> und{' '}
          <code className="rounded bg-surface-2 px-1 text-[0.85em]">_ga_&lt;ID&gt;</code>,
          Laufzeit bis zu zwei Jahre) und ausgelesen. Verarbeitet werden unter
          anderem eine zufällig erzeugte Nutzerkennung, aufgerufene Seiten,
          Ereignisse in der App, ungefährer Standort, Gerätetyp und Browser.
          Inhalte deiner Wohnungs- oder Messdaten werden nicht übertragen.
        </p>
        <p>
          <strong>Ohne deine Einwilligung wird Google Analytics nicht geladen</strong> –
          es werden weder Cookies gesetzt noch Daten übertragen.
        </p>
        <p>
          Rechtsgrundlage für das Speichern und Auslesen von Informationen auf
          deinem Endgerät ist § 25 Abs. 1 TDDDG, für die anschließende
          Verarbeitung Art. 6 Abs. 1 lit. a DSGVO. Du kannst deine Einwilligung
          jederzeit mit Wirkung für die Zukunft widerrufen; die Rechtmäßigkeit
          der bis dahin erfolgten Verarbeitung bleibt davon unberührt.
        </p>
        <p>
          Eine Übermittlung in die USA an Google LLC ist nicht ausgeschlossen.
          Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert;
          ergänzend bestehen Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c
          DSGVO. Trotz dieser Garantien lässt sich ein Zugriff US-amerikanischer
          Behörden nicht vollständig ausschließen.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={openSettings}
            className="focus-ring rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            {t('consent.manage')}
          </button>
          <span className="text-xs">
            {analyticsGranted ? t('consent.status.granted') : t('consent.status.denied')}
          </span>
        </div>
      </LegalSection>

      <LegalSection title="10. Empfänger und Auftragsverarbeitung">
        <p>
          Die oben genannten Dienste (Firebase Hosting, Firebase Authentication,
          Cloud Firestore, Cloud Functions, Gemini-API, Google Analytics) werden
          von Google Ireland Limited erbracht und auf Grundlage eines
          Auftragsverarbeitungsvertrags nach Art. 28 DSGVO eingesetzt. Die
          Auslieferung über GitHub Pages erfolgt durch GitHub B.V. Eine
          Weitergabe deiner Daten an weitere Dritte findet nicht statt.
        </p>
      </LegalSection>

      <LegalSection title="11. Speicherdauer">
        <p>
          Lokal gespeicherte Daten bleiben, bis du sie löschst. Daten in deinem
          Konto bleiben gespeichert, bis du sie in der App löschst oder die
          Löschung deines Kontos verlangst. Rückmeldungen werden gelöscht, sobald
          sie ausgewertet sind. Analytics-Daten werden von Google nach
          spätestens 14 Monaten automatisch gelöscht.
        </p>
      </LegalSection>

      <LegalSection title="12. Deine Rechte">
        <p>Dir stehen gegenüber dem Verantwortlichen folgende Rechte zu:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>
            Widerspruch gegen Verarbeitungen auf Grundlage berechtigter
            Interessen (Art. 21 DSGVO)
          </li>
          <li>
            Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft
            (Art. 7 Abs. 3 DSGVO)
          </li>
        </ul>
        <p>
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
          zu beschweren (Art. 77 DSGVO). Zuständig ist die Aufsichtsbehörde des
          Bundeslandes, in dem der Verantwortliche seinen Sitz hat; eine
          Beschwerde ist auch bei der Behörde deines gewöhnlichen Aufenthaltsorts
          möglich.
        </p>
      </LegalSection>

      <LegalSection title="13. Änderungen dieser Erklärung">
        <p>
          Wir passen diese Datenschutzerklärung an, sobald sich die Anwendung
          oder die eingesetzten Dienste ändern. Werden dabei zusätzliche
          einwilligungsbedürftige Dienste eingeführt, fragen wir dich erneut nach
          deiner Einwilligung.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
