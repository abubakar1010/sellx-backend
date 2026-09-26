export interface IFilterOptionValue {
    value: string;
    label: { en: string; no: string };
}

export interface IFilterFieldDependency {
    field: string;
    /** The single value the dependency is satisfied by. */
    value?: string;
    /** Any one of these values satisfies the dependency. Use instead of `value`. */
    values?: string[];
}

export interface IFilterField {
    key: string;
    label: { en: string; no: string };
    inputType:
        | 'range'
        | 'single_select'
        | 'multi_select'
        | 'date'
        | 'location'
        | 'map'
        | 'boolean'
        | 'text';
    /**
     * The allowed values on a select. On a `text` field they are *suggestions*
     * for an autocomplete — the input still accepts anything.
     */
    options?: IFilterOptionValue[];
    dependsOn?: IFilterFieldDependency | null;
}

export interface ISortOption {
    key: string;
    label: { en: string; no: string };
    isDefault?: boolean;
}

export interface IFilterOptionsResponse {
    category: string;
    filters: IFilterField[];
    sorts: ISortOption[];
}
