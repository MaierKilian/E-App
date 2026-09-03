import { Link } from 'react-router-dom'
import { LegalPage, LegalSection, LegalValue, LegalIncompleteNotice } from './LegalPage'
import { OPERATOR, addressLines, missingOperatorFields, responsiblePerson } from './operator'

/** Klartext-Namen der Pflichtfelder für den Unvollständigkeits-Hinweis. */
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  street: 'Straße und Hausnummer',
  postalCode: 'Postleitzahl',
  city: 'Ort',
  email: 'E-Mail-Adresse',
}

/**
 * Impressum nach § 5 DDG (seit 2024 Nachfolger des § 5 TMG) und § 18 Abs. 2
 * MStV.
 *
 * Die Angaben stammen ausschließlich aus `operator.ts` – hier steht kein
 * einziger Wert fest im Text. Wer den Betreiber wechselt, ändert eine Datei.
 */
export function ImprintPage() {
  const missing = missingOperatorFields().map((field) => FIELD_LABELS[field] ?? field)
  const address = addressLines()

  return (
    <LegalPage title="Impressum" intro="Angaben gemäß § 5 DDG">
      <LegalIncompleteNotice fields={missing} />

      <LegalSection title="Anbieter">
        <p>
          <LegalValue value={OPERATOR.name} hint="Name noch einzutragen" />
        </p>
        {address.length > 0 ? (
          <p>
            {address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : (
          <p>
            <LegalValue value="" hint="Anschrift noch einzutragen" />
          </p>
        )}
        <p className="text-xs">
          E-App ist ein privates, nicht-geschäftsmäßiges Projekt. Es werden keine
          entgeltlichen Leistungen angeboten.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          E-Mail:{' '}
          {OPERATOR.email ? (
            <a
              href={`mailto:${OPERATOR.email}`}
              className="focus-ring rounded font-medium text-foreground underline underline-offset-2"
            >
              {OPERATOR.email}
            </a>
          ) : (
            <LegalValue value="" hint="E-Mail-Adresse noch einzutragen" />
          )}
        </p>
        {OPERATOR.phone.trim() && <p>Telefon: {OPERATOR.phone}</p>}
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          <LegalValue value={responsiblePerson()} hint="Name noch einzutragen" />
          {address.length > 0 && (
            <>
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </>
          )}
        </p>
      </LegalSection>

      <LegalSection title="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungs­verfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte">
        <p>
          Die Inhalte dieser Anwendung werden mit Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität können wir jedoch keine
          Gewähr übernehmen. Alle Berechnungen, Bewertungen und Einsparhinweise
          der App sind Orientierungswerte auf Basis der eingegebenen Angaben und
          ersetzen keine fachliche Energieberatung.
        </p>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
          verantwortlich, jedoch nach §§ 8 bis 10 DDG nicht verpflichtet,
          übermittelte oder gespeicherte fremde Informationen zu überwachen.
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
          Informationen nach den allgemeinen Gesetzen bleiben unberührt. Eine
          diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer
          konkreten Rechtsverletzung möglich; bei Bekanntwerden entsprechender
          Rechtsverletzungen entfernen wir diese Inhalte umgehend.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Links">
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
          Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
          Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar.
          Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links
          umgehend.
        </p>
      </LegalSection>

      <LegalSection title="Urheberrecht">
        <p>
          Die durch die Betreiber erstellten Inhalte und Werke in dieser
          Anwendung unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind
          als solche gekennzeichnet. Vervielfältigung, Bearbeitung, Verbreitung
          und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
          bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw.
          Erstellers.
        </p>
      </LegalSection>

      <LegalSection title="Datenschutz">
        <p>
          Wie wir mit personenbezogenen Daten umgehen, steht in der{' '}
          <Link
            to="/datenschutz"
            className="focus-ring rounded font-medium text-foreground underline underline-offset-2"
          >
            Datenschutzerklärung
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
