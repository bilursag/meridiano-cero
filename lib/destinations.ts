/** Curated catalog of the study-tour destinations Meridiano Cero actually sells (meridianocero.cl). */
export const KNOWN_DESTINATIONS = [
  {
    id: 'bariloche',
    label: 'Bariloche, Argentina',
    lat: -41.1335,
    lng: -71.3103,
  },
  {
    id: 'camboriu',
    label: 'Camboriú, Brasil',
    lat: -26.9906,
    lng: -48.6349,
  },
  {
    id: 'sur-de-chile',
    label: 'Sur de Chile (Pucón)',
    lat: -39.2828,
    lng: -71.975,
  },
  {
    id: 'isla-de-pascua',
    label: 'Isla de Pascua, Chile',
    lat: -27.1502,
    lng: -109.426,
  },
  {
    id: 'huilo-huilo',
    label: 'Huilo-Huilo, Chile',
    lat: -39.8667,
    lng: -71.8333,
  },
  {
    id: 'puerto-varas',
    label: 'Puerto Varas, Chile',
    lat: -41.3195,
    lng: -72.9854,
  },
  {
    id: 'republica-dominicana',
    label: 'República Dominicana (Punta Cana)',
    lat: 18.5601,
    lng: -68.3725,
  },
] as const

export type KnownDestinationId = (typeof KNOWN_DESTINATIONS)[number]['id']
