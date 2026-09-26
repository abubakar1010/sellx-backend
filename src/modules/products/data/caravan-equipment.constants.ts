/** Caravan ("campingvogn") equipment checkboxes, as listed in the spec. */
export const CARAVAN_EQUIPMENT = {
    alu_felger: { en: 'Alloy rims', no: 'Alu. felger' },
    cruisekontroll: { en: 'Cruise control', no: 'Cruisekontroll' },
    dyrefri: { en: 'Pet-free', no: 'Dyrefri' },
    fast_toalett: { en: 'Fixed toilet', no: 'Fast toalett' },
    fortelt_sommer: { en: 'Awning, summer', no: 'Fortelt, sommer' },
    fortelt_vinter: { en: 'Awning, winter', no: 'Fortelt, vinter' },
    fryseboks: { en: 'Freezer', no: 'Fryseboks' },
    gassuttak: { en: 'Gas outlet', no: 'Gassuttak' },
    gulvvarme: { en: 'Underfloor heating', no: 'Gulvvarme' },
    koleskap: { en: 'Refrigerator', no: 'Kjøleskap' },
    mikrobolgeovn: { en: 'Microwave', no: 'Mikrobølgeovn' },
    radio_cd: { en: 'Radio/CD', no: 'Radio/CD' },
    radio_kassett: { en: 'Radio/cassette', no: 'Radio/kassett' },
    ryggekamera: { en: 'Rear camera', no: 'Ryggekamera' },
    roykefri: { en: 'Smoke-free', no: 'Røykefri' },
    sentralvarme: { en: 'Central heating', no: 'Sentralvarme' },
    sommerhjul: { en: 'Summer wheels', no: 'Sommerhjul' },
    midtarmlene: { en: 'Center armrest', no: 'Midtarmlene' },
    stekeovn: { en: 'Oven', no: 'Stekeovn' },
    sykkelstativ: { en: 'Bike rack', no: 'Sykkelstativ' },
    takgrind_stige: { en: 'Roof rack/ladder', no: 'Takgrind/Stige' },
    tv_antenne: { en: 'TV antenna', no: 'TV-antenne' },
    vannbaren_varme: { en: 'Hydronic heating', no: 'Vannbåren varme' },
    varmtvann: { en: 'Hot water', no: 'Varmtvann' },
    vinterhjul: { en: 'Winter wheels', no: 'Vinterhjul' },
    andre: { en: 'Other', no: 'Andre' },
} as const;

export const CARAVAN_EQUIPMENT_VALUES = Object.keys(
    CARAVAN_EQUIPMENT,
) as (keyof typeof CARAVAN_EQUIPMENT)[];
