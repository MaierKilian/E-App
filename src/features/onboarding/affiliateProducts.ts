import type { InstrumentType } from '@/types'

/**
 * Platzhalter-Produktdaten für Amazon-Affiliate-Empfehlungen.
 * Die `url` ist bewusst ein Platzhalter ("#") – später nur den
 * Affiliate-Link einsetzen. Produktnamen sind generisch gehalten.
 * Bewertung als Wert 0–5 (halbe Sterne erlaubt).
 */
export interface AffiliateProduct {
  id: string
  /** i18n-Schlüssel für den Produktnamen. */
  nameKey: string
  /** i18n-Schlüssel für die kurze Nutzen-Zeile. */
  benefitKey: string
  /** Preis-Platzhalter, z. B. "ab 19,99 €". Über i18n lokalisiert. */
  priceKey: string
  rating: number
  url: string
}

export const AFFILIATE_PRODUCTS: Partial<Record<InstrumentType, AffiliateProduct[]>> = {
  temperature_sensor: [
    {
      id: 'temp_infrared_pro',
      nameKey: 'affiliate.products.temp_infrared_pro.name',
      benefitKey: 'affiliate.products.temp_infrared_pro.benefit',
      priceKey: 'affiliate.products.temp_infrared_pro.price',
      rating: 4.5,
      url: '#',
    },
    {
      id: 'temp_room_smart',
      nameKey: 'affiliate.products.temp_room_smart.name',
      benefitKey: 'affiliate.products.temp_room_smart.benefit',
      priceKey: 'affiliate.products.temp_room_smart.price',
      rating: 4,
      url: '#',
    },
  ],
  distance_meter: [
    {
      id: 'distance_laser',
      nameKey: 'affiliate.products.distance_laser.name',
      benefitKey: 'affiliate.products.distance_laser.benefit',
      priceKey: 'affiliate.products.distance_laser.price',
      rating: 4.5,
      url: '#',
    },
  ],
  co2_sensor: [
    {
      id: 'co2_monitor',
      nameKey: 'affiliate.products.co2_monitor.name',
      benefitKey: 'affiliate.products.co2_monitor.benefit',
      priceKey: 'affiliate.products.co2_monitor.price',
      rating: 4.5,
      url: '#',
    },
  ],
  humidity_sensor: [
    {
      id: 'humidity_hygro',
      nameKey: 'affiliate.products.humidity_hygro.name',
      benefitKey: 'affiliate.products.humidity_hygro.benefit',
      priceKey: 'affiliate.products.humidity_hygro.price',
      rating: 4,
      url: '#',
    },
  ],
  power_meter: [
    {
      id: 'power_plug',
      nameKey: 'affiliate.products.power_plug.name',
      benefitKey: 'affiliate.products.power_plug.benefit',
      priceKey: 'affiliate.products.power_plug.price',
      rating: 4.5,
      url: '#',
    },
  ],
}

export function getAffiliateProducts(type: InstrumentType): AffiliateProduct[] {
  return AFFILIATE_PRODUCTS[type] ?? []
}
