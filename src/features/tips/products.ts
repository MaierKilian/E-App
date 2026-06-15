/**
 * Produkt-Empfehlungen für Tipps (Amazon-Affiliate, vorerst Platzhalter-URL).
 * Bewusst ohne erfundene Sterne-Bewertung – nur Name, Nutzen, Preis.
 * i18n-Schlüssel kommen aus dem bestehenden affiliate.products.*-Baum.
 */
export interface TipProduct {
  nameKey: string
  benefitKey: string
  priceKey: string
  url: string
}

export const TIP_PRODUCTS: Record<string, TipProduct> = {
  smart_plug: {
    nameKey: 'affiliate.products.smart_plug.name',
    benefitKey: 'affiliate.products.smart_plug.benefit',
    priceKey: 'affiliate.products.smart_plug.price',
    url: '#',
  },
  eco_showerhead: {
    nameKey: 'affiliate.products.eco_showerhead.name',
    benefitKey: 'affiliate.products.eco_showerhead.benefit',
    priceKey: 'affiliate.products.eco_showerhead.price',
    url: '#',
  },
}
