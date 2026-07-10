/**
 * Produkt-Empfehlungen für Tipps als Amazon-Suchlinks (klickbar, führen zum
 * jeweiligen Suchbegriff). Ein optionaler Partner-Tag kann später ergänzt
 * werden, um die Links als Affiliate-Links zu monetarisieren.
 */

const AMAZON_DOMAIN = 'https://www.amazon.de'

/** Amazon-Partner-Tag (leer = normaler Suchlink). Später hier eintragen. */
export const AMAZON_PARTNER_TAG = ''

/** Baut einen Amazon-Such-Link für einen Suchbegriff (optional mit Partner-Tag). */
export function amazonSearchUrl(query: string): string {
  const base = `${AMAZON_DOMAIN}/s?k=${encodeURIComponent(query)}`
  return AMAZON_PARTNER_TAG ? `${base}&tag=${AMAZON_PARTNER_TAG}` : base
}

export interface TipProduct {
  /** Suchbegriff für Amazon. */
  query: string
  /** Optionaler Preis-Hinweis (i18n-Schlüssel). */
  priceKey?: string
}

export const TIP_PRODUCTS: Record<string, TipProduct> = {
  smart_plug: {
    query: 'schaltbare steckdosenleiste smart',
    priceKey: 'affiliate.products.smart_plug.price',
  },
  eco_showerhead: {
    query: 'sparduschkopf wassersparend',
    priceKey: 'affiliate.products.eco_showerhead.price',
  },
  led: { query: 'led lampe e27 warmweiß' },
  smart_thermostat: { query: 'heizkörperthermostat smart' },
  smart_heating: { query: 'smarte heizungssteuerung' },
  hygrometer: {
    query: 'thermo hygrometer luftfeuchtigkeit innen',
    priceKey: 'affiliate.products.humidity_hygro.price',
  },
  power_meter: {
    query: 'energiekosten messgerät strom',
    priceKey: 'affiliate.products.power_plug.price',
  },
  draft_seal: { query: 'fenster dichtungsband selbstklebend' },
  fridge_thermometer: { query: 'kühlschrankthermometer digital' },
  pipe_insulation: { query: 'rohrisolierung warmwasser' },
  radiator_reflector: { query: 'heizkörper reflektorfolie' },
}
