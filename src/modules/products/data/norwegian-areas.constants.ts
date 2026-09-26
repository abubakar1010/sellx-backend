/**
 * The 20 areas ("Områder") a tenant can request on the property
 * "wanted to rent" form. Mixed regions and cities, exactly as the spec lists them.
 */
export const NORWEGIAN_AREAS = {
    agder: 'Agder',
    akershus: 'Akershus',
    bergen: 'Bergen',
    buskerud: 'Buskerud',
    finnmark: 'Finnmark',
    innlandet: 'Innlandet',
    kristiansand: 'Kristiansand',
    more_og_romsdal: 'Møre og Romsdal',
    nordland: 'Nordland',
    oslo: 'Oslo',
    rogaland: 'Rogaland',
    stavanger: 'Stavanger',
    svalbard: 'Svalbard',
    telemark: 'Telemark',
    troms: 'Troms',
    trondelag: 'Trøndelag',
    trondheim: 'Trondheim',
    vestfold: 'Vestfold',
    vestland: 'Vestland',
    ostfold: 'Østfold',
} as const;

export const NORWEGIAN_AREA_VALUES = Object.keys(
    NORWEGIAN_AREAS,
) as (keyof typeof NORWEGIAN_AREAS)[];
