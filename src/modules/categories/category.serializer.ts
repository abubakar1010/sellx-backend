// src/modules/category/category.serializer.ts
import type { SerializerFn } from '@/core/types/serializer.types';
import type { ICategoryDocument } from './category.interface';

export interface CategoryResponseDto {
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
    description?: string;
    basicPricing?: number;
    plusPricing?: number;
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const resolveId = (category: ICategoryDocument): string =>
    category.id ?? String((category as any)._id ?? '');

export const serializeCategory: SerializerFn<ICategoryDocument, CategoryResponseDto> = (
    category,
): CategoryResponseDto => ({
    id: resolveId(category),
    title: category.title,
    slug: category.slug,
    thumbnail: category.thumbnail,
    description: category.description,
    basicPricing: category.basicPricing,
    plusPricing: category.plusPricing,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
});

export const serializeCategories = (categories: ICategoryDocument[]): CategoryResponseDto[] => {
    return categories.map(serializeCategory);
};
