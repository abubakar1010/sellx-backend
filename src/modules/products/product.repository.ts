import type { ClientSession } from 'mongoose';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IProduct } from './product.interface';
import { FavoriteModel, Product, ProductReportModel, RecentlyViewedModel } from './products.model';
import { StoreModel } from '@/modules/stores/store.model';

const createAbortError = (): Error => {
    const abortError = new Error('Operation aborted.');
    abortError.name = 'AbortError';
    return abortError;
};

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) throw createAbortError();
    return new Promise<T>((resolve, reject) => {
        const abortHandler = () => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });
        promise
            .then(resolve)
            .catch(reject)
            .finally(() => signal.removeEventListener('abort', abortHandler));
    });
};

const resolveSession = (
    options?: RepositoryWriteOptions,
): { session?: ClientSession } | undefined =>
    options?.session ? { session: options.session as ClientSession } : undefined;

export class ProductRepository extends BaseMongooseRepository<IProduct> {
    constructor() {
        super(Product);
    }

    async getBlockedStoreIds(): Promise<string[]> {
        const blocked = await StoreModel
            .find({ status: 'blocked' })
            .select('_id')
            .lean();
        return blocked.map((s: any) => s._id.toString());
    }

    async findByIdWithSeller(productId: string, options?: RepositoryQueryOptions) {
        try {
            const op = this.model
                .findById(productId)
                .populate('user', 'firstName lastName avatarUrl avgRating totalReviewCount phone')
                .populate('category', 'title slug')
                .lean();
            return await withAbort(op as any, options?.signal);
        } catch {
            const op = this.model
                .findById(productId)
                .populate('user', 'firstName lastName avatarUrl avgRating totalReviewCount phone')
                .lean();
            return await withAbort(op as any, options?.signal);
        }
    }

    async paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IProduct>> {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const skip = (page - 1) * limit;

        const [total, data] = await Promise.all([
            this.model.countDocuments(filter),
            this.model
                .find(filter)
                .populate('user', 'firstName lastName avatarUrl avgRating')
                .populate('category', 'title slug')
                .sort(params.sort || '-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    async toggleFavorite(userId: string, productId: string, options?: RepositoryWriteOptions) {
        const existing = await FavoriteModel.findOne({ user: userId, product: productId }).lean();
        if (existing) {
            await Promise.all([
                FavoriteModel.deleteOne({ _id: (existing as any)._id }, resolveSession(options)),
                Product.updateOne({ _id: productId }, { $inc: { favoriteCount: -1 } }),
            ]);
            return false;
        }
        await Promise.all([
            FavoriteModel.create([{ user: userId, product: productId }], resolveSession(options)),
            Product.updateOne({ _id: productId }, { $inc: { favoriteCount: 1 } }),
        ]);
        return true;
    }

    async isFavorite(userId: string, productId: string) {
        const exists = await FavoriteModel.exists({ user: userId, product: productId });
        return !!exists;
    }

    async createReport(data: any, options?: RepositoryWriteOptions) {
        return ProductReportModel.create([data], resolveSession(options)).then((r: any) => r[0]);
    }

    async hasReported(userId: string, productId: string) {
        const exists = await ProductReportModel.exists({ reporter: userId, product: productId });
        return !!exists;
    }

    async findReportedProductIds(userId: string): Promise<string[]> {
        const reports = await ProductReportModel.find({ reporter: userId }).select('product').lean();
        return reports.map((r: any) => String(r.product));
    }

    async incrementViewCount(productId: string): Promise<void> {
        await Product.updateOne({ _id: productId }, { $inc: { viewCount: 1 } });
    }

    async upsertRecentlyViewed(userId: string, productId: string): Promise<void> {
        await RecentlyViewedModel.updateOne(
            { user: userId, product: productId },
            { $set: { viewedAt: new Date() } },
            { upsert: true },
        );
    }

    async findRecentlyViewed(
        userId: string,
        page: number,
        limit: number,
    ): Promise<OffsetPaginationResult<IProduct>> {
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            RecentlyViewedModel.countDocuments({ user: userId }),
            RecentlyViewedModel.find({ user: userId })
                .sort({ viewedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'product',
                    populate: [
                        { path: 'user', select: 'firstName lastName avatarUrl avgRating' },
                        { path: 'category', select: 'title slug' },
                    ],
                })
                .lean(),
        ]);

        const data = docs.map((d: any) => d.product).filter(Boolean);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data,
            meta: {
                page, limit, total, totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    async deleteRecentlyViewedByProduct(productId: string): Promise<void> {
        await RecentlyViewedModel.deleteMany({ product: productId });
    }

    async incrementSoldCount(productId: string): Promise<void> {
        await Product.updateOne({ _id: productId }, { $inc: { soldCount: 1 } });
    }

    async findFavorites(
        userId: string,
        page: number,
        limit: number,
    ): Promise<OffsetPaginationResult<IProduct>> {
        const skip = (page - 1) * limit;
        const [total, docs] = await Promise.all([
            FavoriteModel.countDocuments({ user: userId }),
            FavoriteModel.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'product',
                    populate: [
                        { path: 'user', select: 'firstName lastName avatarUrl avgRating' },
                        { path: 'category', select: 'title slug' },
                    ],
                })
                .lean(),
        ]);

        const data = docs.map((d: any) => d.product).filter(Boolean);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async findMyProducts(
        userId: string,
        filter: Record<string, unknown>,
        page: number,
        limit: number,
        sort: string = '-createdAt',
    ) {
        const skip = (page - 1) * limit;
        const [total, data] = await Promise.all([
            this.model.countDocuments({ ...filter, user: userId }),
            this.model
                .find({ ...filter, user: userId })
                .populate('category', 'title slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async areFavorited(userId: string, productIds: string[]): Promise<Set<string>> {
        const favorites = await FavoriteModel.find({ user: userId, product: { $in: productIds } })
            .select('product')
            .lean();
        return new Set(favorites.map((f: any) => String(f.product)));
    }

    async areReported(userId: string, productIds: string[]): Promise<Set<string>> {
        const reports = await ProductReportModel.find({ reporter: userId, product: { $in: productIds } })
            .select('product')
            .lean();
        return new Set(reports.map((r: any) => String(r.product)));
    }

    async findByStore(
        storeId: string,
        filter: Record<string, unknown>,
        page: number,
        limit: number,
        sort: string = '-createdAt',
    ) {
        const skip = (page - 1) * limit;
        const [total, data] = await Promise.all([
            this.model.countDocuments({ ...filter, store: storeId }),
            this.model
                .find({ ...filter, store: storeId })
                .populate('user', 'firstName lastName avatarUrl')
                .populate('category', 'title slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
}

export const productRepository = new ProductRepository();
