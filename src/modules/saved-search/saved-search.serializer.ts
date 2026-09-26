import type { ISavedSearchDocument, ISavedSearchFilters } from './saved-search.interface';

export interface SavedSearchResponseDto {
    id: string;
    text?: string;
    category?: string;
    filters?: ISavedSearchFilters;
    sort?: string;
    createdAt?: Date;
}

export const serializeSavedSearch = (item: ISavedSearchDocument): SavedSearchResponseDto => ({
    id: item.id ?? String((item as any)._id ?? ''),
    text: item.text,
    category: item.category,
    filters: item.filters,
    sort: item.sort,
    createdAt: item.createdAt,
});

export const serializeSavedSearches = (items: ISavedSearchDocument[]): SavedSearchResponseDto[] =>
    items.map(serializeSavedSearch);
