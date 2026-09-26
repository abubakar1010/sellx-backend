import { CarEquipment } from '../product.enum';

/**
 * Car equipment checkboxes, in the five groups the spec renders them in.
 *
 * The spec repeats four entries across groups (Anti-skid, Diesel particle filter,
 * Level control, Air suspension, and the two tow bars); each value appears once here,
 * in the group it is first listed under.
 *
 * The six values in `CarEquipment` are the subset exposed as *filters*; they keep
 * their exact stored values so existing listings keep matching.
 */
export const CAR_EQUIPMENT_GROUPS = {
    komfort: {
        air_condition: { en: 'Air condition', no: 'Air Condition' },
        [CarEquipment.KLIMAANLEGG]: { en: 'Air conditioning', no: 'Klimaanlegg' },
        bagasjeromstrekk: { en: 'Luggage compartment cover', no: 'Bagasjeromstrekk' },
        cruisekontroll: { en: 'Cruise control', no: 'Cruisekontroll' },
        adaptiv_cruisekontroll: { en: 'Adaptive cruise control', no: 'Adaptiv cruisekontroll' },
        elektrisk_sete_med_minne: { en: 'Electric seat with memory', no: 'Elektrisk sete med minne' },
        elektrisk_sete_uten_minne: { en: 'Electric seat without memory', no: 'Elektrisk sete uten minne' },
        kupevarmer: { en: 'Interior heater', no: 'Kupévarmer' },
        luftfjaering: { en: 'Air suspension', no: 'Luftfjæring' },
        midtarmlener: { en: 'Center armrests', no: 'Midtarmlener' },
        motorvarmer: { en: 'Engine heater', no: 'Motorvarmer' },
        nivaregulering: { en: 'Level control', no: 'Nivåregulering' },
        keyless_start: { en: 'Keyless start', no: 'Keyless start' },
        setevarme: { en: 'Heated seats', no: 'Setevarme' },
        sentrallas: { en: 'Central locking', no: 'Sentrallås' },
        delskinnseter: { en: 'Partial leather seat', no: 'Delskinnseter' },
        helskinnseter: { en: 'Full leather seat', no: 'Helskinnseter' },
        soltak_glasstak: { en: 'Sunroof/glass roof', no: 'Soltak/glasstak' },
        sportsseter: { en: 'Sport seats', no: 'Sportsseter' },
        morke_bakruter: { en: 'Dark rear windows', no: 'Mørke bakruter' },
        parkeringssensor_bak: { en: 'Rear parking sensor', no: 'Parkeringssensor bak' },
        parkeringssensor_foran: { en: 'Front parking sensor', no: 'Parkeringssensor foran' },
        ryggekamera: { en: 'Rear camera', no: 'Ryggekamera' },
    },
    sikkerhet: {
        [CarEquipment.ABS_BREMSER]: { en: 'ABS brakes', no: 'ABS-bremser' },
        [CarEquipment.AIRBAG_FORAN]: { en: 'Airbag front', no: 'Airbag foran' },
        [CarEquipment.ALARM]: { en: 'Alarm', no: 'Alarm' },
        gjenfinningssystem: { en: 'Recovery system', no: 'Gjenfinningssystem' },
        isofix: { en: 'Isofix', no: 'Isofix' },
        sidekollisjonsputer: { en: 'Side airbag', no: 'Sidekollisjonsputer' },
        startsperre: { en: 'Immobilizer', no: 'Startsperre' },
        antiskrens: { en: 'Anti-skid', no: 'Antiskrens' },
        dieselpartikkelfilter: { en: 'Diesel particle filter', no: 'Dieselpartikkelfilter' },
        diff_sperre: { en: 'Diff. lock', no: 'Diff. sperre' },
        servostyring: { en: 'Power steering', no: 'Servostyring' },
        hengerfeste_avtagbar: { en: 'Tow bar, removable/swivel', no: 'Hengerfeste, avtagbar/svingbar' },
        [CarEquipment.HENGERFESTE]: { en: 'Tow bar, fixed hook', no: 'Hengerfeste, fast krok' },
        laserlys: { en: 'Laser light', no: 'Laserlys' },
        led_lys: { en: 'LED light', no: 'LED-lys' },
        xenon_lys: { en: 'Xenon light', no: 'Xenon-lys' },
        fjernlysassistent: { en: 'High beam assistant', no: 'Fjernlysassistent' },
        lyssensor: { en: 'Light sensor', no: 'Lyssensor' },
        regnsensor: { en: 'Rain sensor', no: 'Regnsensor' },
    },
    motor_og_ytelse: {
        kjorecomputer: { en: 'Trip computer', no: 'Kjørecomputer' },
    },
    teknologi: {
        bluetooth: { en: 'Bluetooth', no: 'Bluetooth' },
        cd_spiller: { en: 'CD player', no: 'CD-spiller' },
        handfrisystem: { en: 'Hands-free system', no: 'Håndfrisystem' },
        head_up_display: { en: 'Head up display', no: 'Head up display' },
        navigasjonssystem: { en: 'Navigation system', no: 'Navigasjonssystem' },
        original_telefon: { en: 'Original phone', no: 'Original telefon' },
        [CarEquipment.RADIO_DAB]: { en: 'Radio DAB+', no: 'Radio DAB+' },
        radio_fm: { en: 'Radio FM', no: 'Radio FM' },
        tv_skjerm_bak: { en: 'TV screen in the rear seat', no: 'TV-skjerm i baksetet' },
    },
    eksterior: {
        takgrind_skistativ: { en: 'Cargo carriers/ski rack', no: 'Takgrind/skistativ' },
        lettmetallfelger_sommer: { en: 'Alloy rims, summer', no: 'Lettmetallfelger, sommer' },
        lettmetallfelger_vinter: { en: 'Alloy rims, winter', no: 'Lettmetallfelger, vinter' },
        metallic_lakk: { en: 'Metallic paint', no: 'Metallic lakk' },
        takrails: { en: 'Roof rails', no: 'Takrails' },
        sommerhjul: { en: 'Summer wheels', no: 'Sommerhjul' },
        vinterhjul: { en: 'Winter wheels', no: 'Vinterhjul' },
        elektriske_speil: { en: 'Electric mirrors', no: 'Elektriske speil' },
        elektriske_vinduer: { en: 'Electric windows', no: 'Elektriske vinduer' },
    },
} as const;

export const CAR_EQUIPMENT_VALUES = Object.values(CAR_EQUIPMENT_GROUPS).flatMap((group) =>
    Object.keys(group),
);
