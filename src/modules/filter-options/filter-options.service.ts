import type { IFilterOptionsResponse } from './filter-options.interface';
import { FILTER_DEFINITIONS, SORT_DEFINITIONS, BRAND_MODEL_MAPS } from './filter-options.constants';

export class FilterOptionsService {
    getOptions(categorySlug: string): IFilterOptionsResponse {
        const filters = FILTER_DEFINITIONS[categorySlug] ?? FILTER_DEFINITIONS['sellx']!;
        const sorts = SORT_DEFINITIONS[categorySlug] ?? SORT_DEFINITIONS['sellx']!;
        return { category: categorySlug, filters, sorts };
    }

    getModelsForBrand(categorySlug: string, brand: string): string[] {
        const brandMap = BRAND_MODEL_MAPS[categorySlug];
        if (!brandMap) return [];
        return [...(brandMap[brand] ?? [])];
    }
}

export const filterOptionsService = new FilterOptionsService();
