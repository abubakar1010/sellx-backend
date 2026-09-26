import { MESSAGES } from '@/core/constants/messages';
import { ConflictError, NotFoundError } from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { storeRepository, type StoreRepository } from './store.repository';
import { categoryRepository } from '../categories/category.repository';
import { userRepository } from '../user/user.repository';
import type { IStoreDocument } from './store.interface';
import type { CreateStoreBody, UpdateStoreBody } from './store.validation';
import { Types } from 'mongoose';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const generateSlug = (name: string): string =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

export class StoreService {
    constructor(private readonly repository: StoreRepository = storeRepository) {}

    async listStores(page: number, limit: number): Promise<{ data: any[]; meta: any }> {
        const result = await this.repository.paginateActive({ page, limit });
        return {
            data: result.data.map((s: any) => ({
                id: s._id?.toString() ?? s.id,
                name: s.name,
                logo: s.logo,
                slug: s.slug,
                category: s.category
                    ? {
                          id: s.category._id?.toString() ?? s.category.id,
                          title: s.category.title,
                          slug: s.category.slug,
                      }
                    : null,
                isVerified: s.isVerified,
                totalProducts: s.totalProducts ?? 0,
                avgRating: s.avgRating ?? 0,
                followerCount: s.followerCount ?? 0,
            })),
            meta: {
                pagination: {
                    currentPage: page,
                    limit,
                    totalCount: result.total,
                    totalPages: Math.ceil(result.total / limit),
                    hasNextPage: page < Math.ceil(result.total / limit),
                    hasPrevPage: page > 1,
                },
            },
        };
    }

    async createStore(
        userId: string,
        payload: CreateStoreBody,
        options?: RepositoryWriteOptions,
    ): Promise<IStoreDocument> {
        const existing = await this.repository.findByUser(userId);
        if (existing) {
            throw new ConflictError(
                'You can only create one store per account',
                'STORE_ALREADY_EXISTS',
            );
        }

        const categoryExists = await categoryRepository.findById(payload.category);
        if (!categoryExists) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        const slug = generateSlug(payload.name);
        const slugExists = await this.repository.existsBySlug(slug);
        if (slugExists) {
            throw new ConflictError('Store with this name already exists', 'STORE_SLUG_EXISTS');
        }

        const store = await this.repository.create(
            {
                user: new Types.ObjectId(userId),
                name: payload.name,
                slug,
                logo: payload.logo,
                banner: payload.banner,
                description: payload.description,
                category: new Types.ObjectId(payload.category),
                contacts: payload.contacts ?? [],
                status: 'active',
                isActive: true,
            },
            options,
        );

        await userRepository.updateById(userId, {
            activeProfileType: 'store',
            activeStoreId: store.id,
        });

        const user = await userRepository.findById(userId);
        const fullName = user ? `${user.firstName} ${user.lastName}` : 'A user';
        addActivityJob({
            activityType: 'store_created',
            actorId: userId,
            actorType: 'user',
            targetId: store.id,
            targetType: 'store',
            message: `${fullName} created a new store ${payload.name}.`,
            metadata: { store_name: payload.name },
        });

        return store;
    }

    async updateSelfStore(
        userId: string,
        payload: UpdateStoreBody,
        options?: RepositoryWriteOptions,
    ): Promise<IStoreDocument> {
        const existing = await this.repository.findByUser(userId);
        if (!existing) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        if (payload.name && payload.name !== existing.name) {
            const slug = generateSlug(payload.name);
            const slugExists = await this.repository.existsBySlug(slug, existing.id);
            if (slugExists) {
                throw new ConflictError('Store with this name already exists', 'STORE_SLUG_EXISTS');
            }
        }

        const updateData: Record<string, unknown> = { ...payload };
        if (payload.name && payload.name !== existing.name) {
            updateData.slug = generateSlug(payload.name);
        }

        const unsetOps: string[] = [];
        if (payload.logo === null) {
            unsetOps.push('logo');
            delete updateData.logo;
        }
        if (payload.banner === null) {
            unsetOps.push('banner');
            delete updateData.banner;
        }

        const updated = await this.repository.updateById(existing.id, updateData, options);
        if (!updated) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        if (unsetOps.length > 0) {
            await this.repository.unsetFields(existing.id, unsetOps);
        }

        return updated;
    }

    async getSelfStore(userId: string, options?: RepositoryQueryOptions): Promise<IStoreDocument> {
        const store = await this.repository.findByUserWithCategories(userId, options);
        if (!store) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        await userRepository.updateById(userId, {
            activeProfileType: 'store',
            activeStoreId: store.id,
        });

        return store;
    }

    async getStoreById(storeId: string, options?: RepositoryQueryOptions): Promise<IStoreDocument> {
        const store = await this.repository.findByIdWithPopulate(storeId, 'category');
        if (!store) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }
        return store;
    }

    async getStoreBySlug(slug: string, options?: RepositoryQueryOptions): Promise<IStoreDocument> {
        const store = await this.repository.findOneWithPopulate({ slug }, 'category');
        if (!store) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }
        return store;
    }

    async getUserStore(
        userId: string,
        options?: RepositoryQueryOptions,
    ): Promise<IStoreDocument | null> {
        return this.repository.findByUserWithCategories(userId, options);
    }

    async deleteStore(
        storeId: string,
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        const existing = await this.repository.findById(storeId, options as RepositoryQueryOptions);
        if (!existing) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        if (existing.user.toString() !== userId) {
            throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        await this.repository.updateById(storeId, { status: 'blocked', isActive: false }, options);
    }
}

export const storeService = new StoreService();
