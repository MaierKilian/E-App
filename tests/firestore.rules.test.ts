import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from '@firebase/rules-unit-testing'
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * Sicherheits-Testsuite für firestore.rules.
 *
 * Prüft alle Wege, die die App tatsächlich beschreitet – vor allem die
 * Rechte-Trennung zwischen Besitzer und Editor, den Einladungs-Flow und die
 * Eigentumsübertragung.
 *
 * Ausführung: `npm run test:rules` – startet den Firestore-Emulator (Java nötig)
 * und lässt Vitest gegen die Rules laufen.
 */

const PROJECT_ID = 'eapp-rules-tests'
const HOST = '127.0.0.1'
const PORT = 8080
const RULES = readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8')

const OWNER = 'owner-uid'
const EDITOR = 'editor-uid'
const STRANGER = 'stranger-uid'
const NEW_MEMBER = 'newmember-uid'

const PID = 'profile-1'
const INVITE_ACTIVE = 'invite-active'
const INVITE_INACTIVE = 'invite-revoked'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT, rules: RULES },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  // Ausgangszustand: eine Wohnung mit Besitzer + Editor, zwei Einladungen.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'profiles', PID), {
      ownerUid: OWNER,
      memberUids: [OWNER, EDITOR],
      roles: { [OWNER]: 'owner', [EDITOR]: 'editor' },
      memberNames: { [OWNER]: 'Alice', [EDITOR]: 'Bob' },
      meta: { name: 'Musterwohnung', image: '' },
      updatedAt: Date.now(),
      state: { hello: 'world' },
    })
    await setDoc(doc(db, 'profiles', PID, 'invites', INVITE_ACTIVE), {
      active: true,
      role: 'editor',
      createdBy: OWNER,
      createdAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'profiles', PID, 'invites', INVITE_INACTIVE), {
      active: false,
      role: 'editor',
      createdBy: OWNER,
      createdAt: serverTimestamp(),
    })
  })
})

function asOwner(): RulesTestContext {
  return env.authenticatedContext(OWNER)
}
function asEditor(): RulesTestContext {
  return env.authenticatedContext(EDITOR)
}
function asStranger(): RulesTestContext {
  return env.authenticatedContext(STRANGER)
}
function asNewMember(): RulesTestContext {
  return env.authenticatedContext(NEW_MEMBER)
}
function anon(): RulesTestContext {
  return env.unauthenticatedContext()
}

describe('profiles: read', () => {
  it('Owner darf lesen', async () => {
    await assertSucceeds(getDoc(doc(asOwner().firestore(), 'profiles', PID)))
  })
  it('Editor darf lesen', async () => {
    await assertSucceeds(getDoc(doc(asEditor().firestore(), 'profiles', PID)))
  })
  it('Fremde dürfen NICHT lesen', async () => {
    await assertFails(getDoc(doc(asStranger().firestore(), 'profiles', PID)))
  })
  it('Anonym darf nicht lesen', async () => {
    await assertFails(getDoc(doc(anon().firestore(), 'profiles', PID)))
  })
})

describe('profiles: create', () => {
  it('Neuer Nutzer legt eine eigene Wohnung an', async () => {
    await assertSucceeds(
      setDoc(doc(asStranger().firestore(), 'profiles', 'new-profile'), {
        ownerUid: STRANGER,
        memberUids: [STRANGER],
        roles: { [STRANGER]: 'owner' },
        memberNames: { [STRANGER]: 'Neu' },
        meta: { name: 'Neu', image: '' },
        updatedAt: Date.now(),
        state: {},
      }),
    )
  })
  it('Anlage mit fremdem Besitzer wird abgelehnt', async () => {
    await assertFails(
      setDoc(doc(asStranger().firestore(), 'profiles', 'sneaky'), {
        ownerUid: OWNER,
        memberUids: [STRANGER],
        roles: { [STRANGER]: 'owner' },
        memberNames: { [STRANGER]: 'X' },
        meta: { name: 'X', image: '' },
        updatedAt: Date.now(),
        state: {},
      }),
    )
  })
})

describe('profiles: update – Editor darf App-Daten schreiben', () => {
  it('Editor darf state ändern (Mitgliedschaft unverändert)', async () => {
    await assertSucceeds(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        state: { changed: true },
        updatedAt: Date.now(),
      }),
    )
  })

  it('Editor darf NICHT ownerUid ändern', async () => {
    await assertFails(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        ownerUid: EDITOR,
      }),
    )
  })

  it('Editor darf NICHT andere Mitglieder entfernen (Rechte-Loch)', async () => {
    // Genau das war die Lücke: früher erlaubt, jetzt verboten.
    await assertFails(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        memberUids: arrayRemove(OWNER),
        [`roles.${OWNER}`]: deleteField(),
        [`memberNames.${OWNER}`]: deleteField(),
      }),
    )
  })

  it('Editor darf NICHT den Besitzer aussperren, auch wenn ownerUid unverändert bleibt', async () => {
    await assertFails(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        memberUids: [EDITOR],
        roles: { [EDITOR]: 'editor' },
        memberNames: { [EDITOR]: 'Bob' },
      }),
    )
  })

  it('Editor darf sich selbst verlassen (Self-Leave)', async () => {
    await assertSucceeds(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        memberUids: arrayRemove(EDITOR),
        [`roles.${EDITOR}`]: deleteField(),
        [`memberNames.${EDITOR}`]: deleteField(),
      }),
    )
  })
})

describe('profiles: update – Besitzer verwaltet Mitgliedschaft', () => {
  it('Besitzer entfernt einen Editor', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID), {
        memberUids: arrayRemove(EDITOR),
        [`roles.${EDITOR}`]: deleteField(),
        [`memberNames.${EDITOR}`]: deleteField(),
      }),
    )
  })

  it('Besitzer darf NICHT den Besitzer wechseln (nur über die dedizierte Transfer-Regel)', async () => {
    // Regel (a) verlangt gleichbleibende ownerUid; ohne die vollständigen
    // Transfer-Felder greift nicht Regel (a2).
    await assertFails(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID), {
        ownerUid: EDITOR,
      }),
    )
  })
})

describe('profiles: update – Beitritt per Einladung', () => {
  it('Nicht-Mitglied tritt mit aktiver Einladung bei', async () => {
    await assertSucceeds(
      updateDoc(doc(asNewMember().firestore(), 'profiles', PID), {
        memberUids: arrayUnion(NEW_MEMBER),
        [`roles.${NEW_MEMBER}`]: 'editor',
        [`memberNames.${NEW_MEMBER}`]: 'Charlie',
        joinInviteId: INVITE_ACTIVE,
      }),
    )
  })

  it('Beitritt mit widerrufener Einladung schlägt fehl', async () => {
    await assertFails(
      updateDoc(doc(asNewMember().firestore(), 'profiles', PID), {
        memberUids: arrayUnion(NEW_MEMBER),
        [`roles.${NEW_MEMBER}`]: 'editor',
        [`memberNames.${NEW_MEMBER}`]: 'Charlie',
        joinInviteId: INVITE_INACTIVE,
      }),
    )
  })

  it('Beitritt mit erfundener Einladung schlägt fehl', async () => {
    await assertFails(
      updateDoc(doc(asNewMember().firestore(), 'profiles', PID), {
        memberUids: arrayUnion(NEW_MEMBER),
        [`roles.${NEW_MEMBER}`]: 'editor',
        [`memberNames.${NEW_MEMBER}`]: 'Charlie',
        joinInviteId: 'unbekannt',
      }),
    )
  })

  it('Beitritt kann sich selbst nicht als Owner eintragen', async () => {
    await assertFails(
      updateDoc(doc(asNewMember().firestore(), 'profiles', PID), {
        memberUids: arrayUnion(NEW_MEMBER),
        [`roles.${NEW_MEMBER}`]: 'owner',
        [`memberNames.${NEW_MEMBER}`]: 'Charlie',
        joinInviteId: INVITE_ACTIVE,
      }),
    )
  })

  it('Nicht angemeldeter Beitritt schlägt fehl', async () => {
    await assertFails(
      updateDoc(doc(anon().firestore(), 'profiles', PID), {
        memberUids: [OWNER, EDITOR, NEW_MEMBER],
        [`roles.${NEW_MEMBER}`]: 'editor',
        [`memberNames.${NEW_MEMBER}`]: 'X',
        joinInviteId: INVITE_ACTIVE,
      }),
    )
  })
})

describe('profiles: update – Eigentumsübertragung', () => {
  it('Besitzer übergibt an bestehendes Mitglied', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID), {
        ownerUid: EDITOR,
        [`roles.${EDITOR}`]: 'owner',
        [`roles.${OWNER}`]: 'editor',
      }),
    )
  })

  it('Übergabe an Nicht-Mitglied wird abgelehnt', async () => {
    await assertFails(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID), {
        ownerUid: STRANGER,
        [`roles.${STRANGER}`]: 'owner',
        [`roles.${OWNER}`]: 'editor',
      }),
    )
  })

  it('Editor darf sich NICHT selbst zum Besitzer machen', async () => {
    await assertFails(
      updateDoc(doc(asEditor().firestore(), 'profiles', PID), {
        ownerUid: EDITOR,
        [`roles.${EDITOR}`]: 'owner',
        [`roles.${OWNER}`]: 'editor',
      }),
    )
  })

  it('Übergabe mit gleichzeitigem state-Update wird abgelehnt (nur ownerUid+roles)', async () => {
    await assertFails(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID), {
        ownerUid: EDITOR,
        [`roles.${EDITOR}`]: 'owner',
        [`roles.${OWNER}`]: 'editor',
        state: { evil: true },
      }),
    )
  })
})

describe('profiles: delete', () => {
  it('Besitzer darf löschen', async () => {
    await assertSucceeds(deleteDoc(doc(asOwner().firestore(), 'profiles', PID)))
  })
  it('Editor darf NICHT löschen', async () => {
    await assertFails(deleteDoc(doc(asEditor().firestore(), 'profiles', PID)))
  })
  it('Fremde dürfen NICHT löschen', async () => {
    await assertFails(deleteDoc(doc(asStranger().firestore(), 'profiles', PID)))
  })
})

describe('invites: subcollection', () => {
  it('Angemeldeter (auch fremder) darf eine Einladung per ID abrufen', async () => {
    await assertSucceeds(
      getDoc(doc(asStranger().firestore(), 'profiles', PID, 'invites', INVITE_ACTIVE)),
    )
  })
  it('Anonym darf keine Einladung abrufen', async () => {
    await assertFails(
      getDoc(doc(anon().firestore(), 'profiles', PID, 'invites', INVITE_ACTIVE)),
    )
  })
  it('Nur Besitzer darf Einladung erstellen', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner().firestore(), 'profiles', PID, 'invites', 'new-invite'), {
        active: true,
        role: 'editor',
        createdBy: OWNER,
        createdAt: serverTimestamp(),
      }),
    )
    await assertFails(
      setDoc(doc(asEditor().firestore(), 'profiles', PID, 'invites', 'editor-invite'), {
        active: true,
        role: 'editor',
        createdBy: EDITOR,
        createdAt: serverTimestamp(),
      }),
    )
  })
  it('Besitzer darf Einladung widerrufen (active:false)', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner().firestore(), 'profiles', PID, 'invites', INVITE_ACTIVE), {
        active: false,
      }),
    )
  })
})

describe('users: Alt-Daten', () => {
  it('Nutzer darf sein eigenes Alt-Dokument lesen/schreiben', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner().firestore(), 'users', OWNER), { state: { legacy: true } }),
    )
  })
  it('Fremder darf Alt-Dokument nicht lesen', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER), { state: { legacy: true } })
    })
    await assertFails(getDoc(doc(asStranger().firestore(), 'users', OWNER)))
  })
})

describe('feedback: anlegen', () => {
  /** Gültiges Feedback-Dokument, wie es `submitFeedback.ts` schreibt. */
  function validFeedback(uid: string) {
    return {
      sentiment: 'good',
      category: 'idea',
      text: 'Die Messung war gut erklärt.',
      source: 'header',
      route: '/measurements',
      appVersion: 'v0.5.0',
      language: 'de',
      theme: 'light',
      demoMode: false,
      viewport: '390x844',
      userAgent: 'Test',
      uid,
      isGuest: false,
      createdAt: serverTimestamp(),
    }
  }

  it('Angemeldeter Nutzer darf Feedback anlegen', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner().firestore(), 'feedback', 'fb-1'), validFeedback(OWNER)),
    )
  })

  it('Gast (anonymes Konto) darf Feedback anlegen', async () => {
    // Der Emulator kennt kein `isAnonymous`; entscheidend ist, dass die Regel
    // nur `request.auth != null` verlangt – ein anonymes Konto erfüllt das.
    await assertSucceeds(
      setDoc(doc(asStranger().firestore(), 'feedback', 'fb-guest'), validFeedback(STRANGER)),
    )
  })

  it('Ohne Anmeldung geht nichts', async () => {
    await assertFails(setDoc(doc(anon().firestore(), 'feedback', 'fb-2'), validFeedback(OWNER)))
  })

  it('Fremde uid im Dokument wird abgelehnt', async () => {
    await assertFails(
      setDoc(doc(asOwner().firestore(), 'feedback', 'fb-3'), validFeedback(STRANGER)),
    )
  })

  it('Zu langer Text wird abgelehnt', async () => {
    await assertFails(
      setDoc(doc(asOwner().firestore(), 'feedback', 'fb-4'), {
        ...validFeedback(OWNER),
        text: 'x'.repeat(2001),
      }),
    )
  })

  it('Unbekannte Stimmung wird abgelehnt', async () => {
    await assertFails(
      setDoc(doc(asOwner().firestore(), 'feedback', 'fb-5'), {
        ...validFeedback(OWNER),
        sentiment: 'angry',
      }),
    )
  })

  it('Fehlender Text wird abgelehnt', async () => {
    const withoutText: Record<string, unknown> = validFeedback(OWNER)
    delete withoutText.text
    await assertFails(setDoc(doc(asOwner().firestore(), 'feedback', 'fb-6'), withoutText))
  })
})

describe('feedback: lesen und ändern', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feedback', 'fb-existing'), {
        sentiment: 'bad',
        text: 'Hier klemmt etwas.',
        uid: OWNER,
      })
    })
  })

  it('Niemand darf Feedback lesen – auch nicht der Verfasser', async () => {
    await assertFails(getDoc(doc(asOwner().firestore(), 'feedback', 'fb-existing')))
  })

  it('Feedback lässt sich nicht nachträglich ändern', async () => {
    await assertFails(
      updateDoc(doc(asOwner().firestore(), 'feedback', 'fb-existing'), { text: 'Doch nicht.' }),
    )
  })

  it('Feedback lässt sich nicht löschen', async () => {
    await assertFails(deleteDoc(doc(asOwner().firestore(), 'feedback', 'fb-existing')))
  })
})

describe('feedback: Austritt', () => {
  /** Austritts-Feedback, wie es `submitExitFeedback()` schreibt. */
  function exitFeedback(uid: string) {
    return {
      sentiment: 'bad',
      category: null,
      text: 'Zu viele Schritte bis zum ersten Ergebnis.',
      kind: 'exit',
      exitReason: 'complex',
      source: 'settings',
      route: '/einstellungen/daten',
      appVersion: 'v0.5.0',
      language: 'de',
      theme: 'light',
      demoMode: false,
      viewport: '390x844',
      userAgent: 'Test',
      uid,
      isGuest: false,
      contactOk: false,
      contactEmail: null,
      createdAt: serverTimestamp(),
    }
  }

  it('Angemeldeter Nutzer darf Austritts-Feedback anlegen', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner().firestore(), 'feedback', 'exit-1'), exitFeedback(OWNER)),
    )
  })

  it('Gast darf Austritts-Feedback anlegen', async () => {
    await assertSucceeds(
      setDoc(doc(asStranger().firestore(), 'feedback', 'exit-2'), exitFeedback(STRANGER)),
    )
  })

  it('Ohne Anmeldung geht auch der Austritt nicht', async () => {
    await assertFails(setDoc(doc(anon().firestore(), 'feedback', 'exit-3'), exitFeedback(OWNER)))
  })

  it('Austritts-Feedback ist ebenfalls nicht lesbar', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feedback', 'exit-existing'), exitFeedback(OWNER))
    })
    await assertFails(getDoc(doc(asOwner().firestore(), 'feedback', 'exit-existing')))
  })
})
