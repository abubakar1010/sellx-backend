import { PropertyFacility } from '../product.enum';

/**
 * Facilities offered as checkboxes on the property listing form (24 options).
 *
 * Deliberately larger than the filter list: `PropertyFacility` in `product.enum.ts`
 * holds the 10 values the spec exposes as *filters*, and those keep their exact
 * stored values so existing listings keep matching. The 14 below are form-only.
 */
export const PROPERTY_FORM_FACILITIES = {
    // The 10 filterable values, re-exported so the form list stays a superset.
    [PropertyFacility.BALKONG_TERRASSE]: { en: 'Balcony/Terrace', no: 'Balkong/terrasse' },
    [PropertyFacility.GARASJE_PARKERING]: { en: 'Parking/Garage', no: 'Garasje/Parkeringsplass' },
    [PropertyFacility.HEIS]: { en: 'Elevator', no: 'Heis' },
    [PropertyFacility.LADEMULIGHET]: { en: 'EV charging', no: 'Lademulighet' },
    [PropertyFacility.PEIS_ILDSTED]: { en: 'Fireplace', no: 'Peis/Ildsted' },
    [PropertyFacility.STRANDLINJE]: { en: 'Beachfront', no: 'Strandlinje' },
    [PropertyFacility.TURTERRENG]: { en: 'Hiking trails', no: 'Turterreng' },
    [PropertyFacility.UTSIKT]: { en: 'Scenic view', no: 'Utsikt' },
    [PropertyFacility.VAKTMESTER]: { en: 'Security service', no: 'Vaktmester' },
    [PropertyFacility.INGEN_GJENBOERE]: { en: 'No overlooking neighbors', no: 'Ingen gjenboere' },

    // Form-only additions.
    klimaanlegg: { en: 'Air conditioning', no: 'Klimaanlegg' },
    takterrasse: { en: 'Rooftop terrace', no: 'Takterrasse' },
    felles_vaskeri: { en: 'Shared laundry', no: 'Felles vaskeri' },
    moderne: { en: 'Modern', no: 'Moderne' },
    fiskemuligheter: { en: 'Fishing spot', no: 'Fiskemuligheter' },
    alarm: { en: 'Alarm system', no: 'Alarm' },
    barnevennlig: { en: 'Child-friendly', no: 'Barnevennlig' },
    bredband: { en: 'High-speed internet', no: 'Bredbånd' },
    kabel_tv: { en: 'Cable TV', no: 'Kabel-TV' },
    offentlig_vann_kloakk: { en: 'Public water/sewage', no: 'Offentlig vann/kloakk' },
    parkett: { en: 'Hardwood floors', no: 'Parkett' },
    rolig: { en: 'Quiet area', no: 'Rolig område' },
    sentralt: { en: 'Central location', no: 'Sentralt' },
    badeplass: { en: 'Swimming spot', no: 'Badeplass' },
} as const;

export const PROPERTY_FORM_FACILITY_VALUES = Object.keys(
    PROPERTY_FORM_FACILITIES,
) as (keyof typeof PROPERTY_FORM_FACILITIES)[];
