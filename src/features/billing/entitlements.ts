import { useAuthStore } from '@/store/authStore'

/**
 * Entitlements – die zentrale Stelle, die einen Tarif (`Plan`) auf konkrete
 * Limits und Features abbildet.
 *
 * Zweck: Freemium (B2C) und spätere Vermieter-/Berater-Tarife (B2B) sollen sich
 * NICHT über verstreute if-Abfragen unterscheiden, sondern ausschließlich über
 * diese Tabelle. Kommt später echtes Billing dazu, ändert sich nur:
 *   1. die Quelle des Plans (`getCurrentPlan`) – künftig aus Firebase Custom
 *      Claims (`request.auth.token.plan`), gesetzt von einer Cloud Function,
 *   2. bei Bedarf die Zahlen in `PLAN_ENTITLEMENTS`.
 *
 * Heute hat jeder Nutzer den Plan `free`. Es gibt noch kein Billing.
 */

export type Plan = 'free' | 'premium' | 'business'

export interface Entitlements {
  /** Maximale Anzahl Wohnprofile, die der Nutzer besitzen/anlegen darf. */
  maxProfiles: number
  /** Maximale Mitgliederzahl je Wohnung (inkl. Besitzer). */
  maxMembersPerProfile: number
  /** Ob der Nutzer Wohnungen teilen darf (Wachstumshebel – im Free-Tarif an). */
  canShare: boolean
}

/**
 * Tarif → Limits. Bewusst großzügig gewählt, damit heute niemand blockiert wird;
 * die Werte sind Platzhalter und lassen sich an genau dieser Stelle justieren,
 * sobald die Preis-/Verpackungsentscheidung steht.
 */
export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    maxProfiles: 3,
    maxMembersPerProfile: 5,
    canShare: true,
  },
  premium: {
    maxProfiles: 10,
    maxMembersPerProfile: 10,
    canShare: true,
  },
  business: {
    // Vermieter/Berater verwalten viele Einheiten – hier später ggf. Seat-basiert.
    maxProfiles: 100,
    maxMembersPerProfile: 50,
    canShare: true,
  },
}

/**
 * Ermittelt den Tarif des angemeldeten Nutzers.
 *
 * Vorbereitet für Firebase Custom Claims: sobald der Token ein `plan`-Claim
 * trägt, kann diese Funktion ihn auslesen. Bis dahin ist jeder `free`.
 */
export function getCurrentPlan(): Plan {
  // Firebase-User trägt heute keinen Plan; später via Custom Claim (token.plan).
  const user = useAuthStore.getState().user as { plan?: Plan } | null
  return user?.plan ?? 'free'
}

/** Liefert die Limits/Features für einen Plan (Standard: aktueller Nutzer). */
export function getEntitlements(plan: Plan = getCurrentPlan()): Entitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free
}
