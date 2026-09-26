import { NotFoundError, ConflictError } from '@/core/errors';
import type { RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import type { ISavedSearchDocument, ISavedSearchFilters } from './saved-search.interface';
import { savedSearchRepository, SavedSearchRepository } from './saved-search.repository';

export interface CreateSavedSearchData {
    text?: string;
    category?: string;
    filters?: ISavedSearchFilters;
    sort?: string;
}

export interface UpdateSavedSearchData {
    text?: string;
    category?: string;
    filters?: ISavedSearchFilters;
    sort?: string;
}

export class SavedSearchService {
    constructor(private readonly repository: SavedSearchRepository = savedSearchRepository) {}

    async create(
        userId: string,
        data: CreateSavedSearchData,
        options?: RepositoryWriteOptions,
    ): Promise<ISavedSearchDocument> {
        if (data.text) {
            const exists = await this.repository.existsByUserAndText(userId, data.text);
            if (exists) {
                throw new ConflictError('This search text is already saved');
            }
        }
        return this.repository.create({
            user: userId,
            text: data.text,
            category: data.category,
            filters: data.filters,
            sort: data.sort,
        } as any, options);
    }

    async update(
        id: string,
        userId: string,
        data: UpdateSavedSearchData,
        options?: RepositoryWriteOptions,
    ): Promise<ISavedSearchDocument> {
        const existing = await this.repository.findById(id, options);
        if (!existing) throw new NotFoundError('Saved search not found');

        if (data.text) {
            const exists = await this.repository.existsByUserAndText(userId, data.text);
            if (exists && existing.id !== exists.id) {
                throw new ConflictError('This search text is already saved');
            }
        }

        const updateData: Record<string, unknown> = {};
        if (data.text !== undefined) updateData.text = data.text;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.filters !== undefined) updateData.filters = data.filters;
        if (data.sort !== undefined) updateData.sort = data.sort;

        const updated = await this.repository.updateById(id, updateData as any, options);
        if (!updated) throw new NotFoundError('Saved search not found');
        return updated;
    }

    async list(
        userId: string,
        pagination: OffsetPaginationParams,
        category?: string,
    ): Promise<OffsetPaginationResult<ISavedSearchDocument>> {
        return this.repository.findByUserPaginated(userId, pagination, category);
    }

    async delete(id: string, userId: string, options?: RepositoryWriteOptions): Promise<void> {
        const deleted = await this.repository.deleteByIdAndUser(id, userId, options);
        if (!deleted) {
            throw new NotFoundError('Saved search not found');
        }
    }
}

export const savedSearchService = new SavedSearchService();
