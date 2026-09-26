// src/modules/category/category.service.ts
import { MESSAGES } from '@/core/constants/messages';
import { ConflictError, NotFoundError } from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import type { CreateCategoryBody, ListCategoriesQuery, UpdateCategoryBody } from './category.validation';
import type { ICategoryDocument } from './category.interface';
import { categoryRepository, type CategoryRepository } from './category.repository';

const escapeRegex = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
const generateSlug = (title: string): string =>
    title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

export class CategoryService {
    constructor(private readonly repository: CategoryRepository = categoryRepository) {}

    async createCategory(
        payload: CreateCategoryBody,
        options?: RepositoryWriteOptions,
    ): Promise<ICategoryDocument> {
        const slugExists = await this.repository.existsBySlug(payload.slug as string, options);
        if (slugExists) {
            throw new ConflictError(MESSAGES.CATEGORY.SLUG_ALREADY_EXISTS, 'CATEGORY_SLUG_EXISTS');
        }

        const titleExists = await this.repository.existsByTitle(payload.title, options);
        if (titleExists) {
            throw new ConflictError(
                MESSAGES.CATEGORY.TITLE_ALREADY_EXISTS,
                'CATEGORY_TITLE_EXISTS',
            );
        }

        const category = await this.repository.create(payload, options);

        return category;
    }

    async updateCategory(
        categoryId: string,
        payload: UpdateCategoryBody,
        options?: RepositoryWriteOptions,
    ): Promise<ICategoryDocument> {
        const existing = await this.repository.findById(categoryId, options as RepositoryQueryOptions);
        if (!existing) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        if (payload.title && payload.title !== existing.title) {
            const titleExists = await this.repository.existsByTitle(payload.title, options);
            if (titleExists) {
                throw new ConflictError(
                    MESSAGES.CATEGORY.TITLE_ALREADY_EXISTS,
                    'CATEGORY_TITLE_EXISTS',
                );
            }
        }

        const updateData: Record<string, unknown> = { ...payload };

        if (payload.title && payload.title !== existing.title) {
            updateData.slug = generateSlug(payload.title);
        }

        const updated = await this.repository.updateById(categoryId, updateData, options);
        if (!updated) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        return updated;
    }

    async listCategories(
        query: ListCategoriesQuery,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<ICategoryDocument>> {
        const filter: Record<string, unknown> = {};

        if (query.search) {
            const safeSearch = escapeRegex(query.search);
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        const pagination: OffsetPaginationParams = {
            page: query.page,
            limit: query.limit,
            sort: query.sort,
        };

        return this.repository.paginateOffset(filter, pagination, options);
    }
}

export const categoryService = new CategoryService();
