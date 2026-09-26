/**
 * Motorhome ("bobil") equipment checkboxes, in the order the spec lists them
 * (Onboarding Screens, pp. 87-88, field 23).
 *
 * All 48 options the spec offers. Keys are ASCII folds of the Norwegian label
 * and are the stored values, so they must not be renamed.
 */
export const MOTORHOME_EQUIPMENT = {
    lettmetallfelger: { en: 'Alloy rims', no: 'Lettmetallfelger' },
    vinterhjul: { en: 'Winter wheels', no: 'Vinterhjul' },
    stotteben: { en: 'Support legs', no: 'Støtteben' },
    markise: { en: 'Awning', no: 'Markise' },
    hengerfeste: { en: 'Tow bar', no: 'Hengerfeste' },
    sykkelstativ: { en: 'Bike rack', no: 'Sykkelstativ' },
    takgrind_stige: { en: 'Roof rack/ladder', no: 'Takgrind/Stige' },
    abs_bremser: { en: 'ABS brakes', no: 'ABS-bremser' },
    gassalarm: { en: 'Gas alarm', no: 'Gassalarm' },
    bilalarm: { en: 'Vehicle alarm', no: 'Bilalarm' },
    airbag_forer: { en: 'Airbag driver', no: 'Airbag fører' },
    airbag_passasjer: { en: 'Airbag passenger', no: 'Airbag passasjer' },
    antiskrens: { en: 'Anti-skid', no: 'Antiskrens' },
    antispinn: { en: 'Traction control', no: 'Antispinn' },
    dieselpartikkelfilter: { en: 'Diesel particle filter', no: 'Dieselpartikkelfilter' },
    sentrallas: { en: 'Central locking', no: 'Sentrallås' },
    luftfjaering: { en: 'Air suspension', no: 'Luftfjæring' },
    klimaanlegg_bildel: { en: 'Air conditioning, cab', no: 'Klimaanlegg bildel' },
    klimaanlegg_bodel: { en: 'Air conditioning, living area', no: 'Klimaanlegg bodel' },
    elvarme: { en: 'Electric heating', no: 'Elvarme' },
    luftvarme: { en: 'Air heating', no: 'Luftvarme' },
    gulvvarme: { en: 'Underfloor heating', no: 'Gulvvarme' },
    vannbaren_varme: { en: 'Hydronic heating', no: 'Vannbåren varme' },
    tilleggsvarme: { en: 'Auxiliary heater (e.g. Webasto)', no: 'Tilleggsvarme (f.eks. Webasto)' },
    varmtvann: { en: 'Hot water', no: 'Varmtvann' },
    frostfri_vanntank: { en: 'Frost-free water tank', no: 'Frostfri vanntank' },
    frostfri_spillevanntank: { en: 'Frost-free waste water tank', no: 'Frostfri spillevanntank' },
    fast_toalett: { en: 'Fixed toilet', no: 'Fast toalett' },
    myggdor: { en: 'Mosquito door', no: 'Myggdør' },
    gassuttak: { en: 'Gas outlet', no: 'Gassuttak' },
    kjoleskap: { en: 'Refrigerator', no: 'Kjøleskap' },
    mikrobolgeovn: { en: 'Microwave', no: 'Mikrobølgeovn' },
    stekeovn: { en: 'Oven', no: 'Stekeovn' },
    elektriske_speil: { en: 'Electric mirrors', no: 'Elektriske speil' },
    elektriske_vinduer: { en: 'Electric windows', no: 'Elektriske vinduer' },
    skinninterior: { en: 'Leather interior', no: 'Skinninteriør' },
    lose_tepper: { en: 'Loose carpets', no: 'Løse tepper' },
    roykfri: { en: 'Smoke-free', no: 'Røykfri' },
    cruisekontroll: { en: 'Cruise control', no: 'Cruisekontroll' },
    ryggekamera: { en: 'Rear camera', no: 'Ryggekamera' },
    kjorecomputer: { en: 'Trip computer', no: 'Kjørecomputer' },
    navigasjonssystem: { en: 'Navigation system', no: 'Navigasjonssystem' },
    radio_cd: { en: 'Radio/CD', no: 'Radio/CD' },
    tv_antenne: { en: 'TV antenna', no: 'TV-antenne' },
    manuell_parabol: { en: 'Manual satellite dish', no: 'Manuell parabol' },
    automatisk_parabol: { en: 'Automatic satellite dish', no: 'Automatisk parabol' },
    tv: { en: 'TV', no: 'TV' },
    dvd: { en: 'DVD', no: 'DVD' },
} as const;

export const MOTORHOME_EQUIPMENT_VALUES = Object.keys(
    MOTORHOME_EQUIPMENT,
) as (keyof typeof MOTORHOME_EQUIPMENT)[];
