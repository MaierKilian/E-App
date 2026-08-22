import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import type { EnergyType } from '@/store/readingsStore'
import type { TipContext } from './buildTips'

/**
 * Sammelt, was die Empfehlungen ausser Profil und Messungen brauchen:
 * Zählerstände und den €-Preis je Zähler-Einheit.
 *
 * Liegt hier und nicht in `buildTips`, damit die Regeln eine reine Funktion
 * bleiben und im Test ohne Stores auskommen. Träger ohne hinterlegten Preis
 * (PV, Solarthermie) fehlen bewusst – ohne Preis entfällt im Text nur der
 * Kostenanteil, die Mengenangabe bleibt.
 */
export function useTipContext(): TipContext {
  const readings = useReadingsStore((s) => s.readings)
  const tariff = useTariffStore()

  const eurPerUnit: Partial<Record<EnergyType, number>> = {}
  for (const key of Object.keys(PRICE_META) as EnergyType[]) {
    const meta = PRICE_META[key]
    if (!meta) continue
    eurPerUnit[key] = resolvePrice(tariff, key).work * meta.priceToEur
  }

  return { readings, eurPerUnit }
}
