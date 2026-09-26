import { NotFoundError } from '@/core/errors';
import { StoreModel } from '@/modules/stores/store.model';
import { UserModel } from '@/modules/user/user.model';
import { Product } from '@/modules/products/products.model';
import { AdCampaignModel } from '@/modules/ads/ads.model';
import { CategoryModel } from '@/modules/categories/category.model';
import type { AdminStoresQuery, StoreProductsQuery } from './stores.validation';

interface AdminStoreRow {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    banner?: string;
    category: { id: string; title: string; slug: string } | null;
    totalProducts: number;
    status: string;
    createdAt?: Date;
}

interface PaginatedAdminStores {
    items: AdminStoreRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface StoreStats {
    totalStores: number;
    pendingStores: number;
    blockedStores: number;
    monthlyRevenue: number;
}

interface StoreOwnerInfo {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    avatarUrl: string;
}

interface StoreDetail {
    id: string;
    name: string;
    slug: string;
    logo: string;
    banner: string;
    description: string;
    category: { id: string; title: string; slug: string } | null;
    status: string;
    totalProducts: number;
    revenue: number;
    followerCount: number;
    totalReviewCount: number;
    avgRating: number;
    responseRate: number;
    contacts: Array<{ type: string; value: string }>;
    owner: StoreOwnerInfo | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AdRow {
    id: string;
    adTitle: string;
    adType: string;
    price: number;
    durationDays: number;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt?: Date;
}

interface PaymentRow {
    id: string;
    packageName: string;
    type: 'boost' | 'promotion' | 'ad' | 'subscription';
    price: number;
    date?: Date;
}

interface StoreProductRow {
    id: string;
    title: string;
    price: number;
    currency: string;
    status: string;
    thumbnail: string | null;
    category_name: string;
    created_at: Date;
    viewCount: number;
}

interface PaginatedStoreProducts {
    items: StoreProductRow[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

function toAdminStoreRow(doc: any): AdminStoreRow {
    const category = doc.category ?? {};
    return {
        id: doc._id?.toString() ?? doc.id,
        name: doc.name ?? '',
        slug: doc.slug ?? '',
        logo: doc.logo,
        banner: doc.banner,
        category: category._id || category.id
            ? { id: category._id?.toString() ?? category.id, title: category.title ?? '', slug: category.slug ?? '' }
            : null,
        totalProducts: doc.totalProducts ?? 0,
        status: doc.status ?? 'active',
        createdAt: doc.createdAt,
    };
}

export const adminStoresService = {
    async list(query: AdminStoresQuery): Promise<PaginatedAdminStores> {
        const filter: Record<string, unknown> = {};

        if (query.filter === 'active') filter.status = 'active';
        else if (query.filter === 'pending') filter.status = 'pending';
        else if (query.filter === 'blocked') filter.status = 'blocked';

        if (query.search) {
            const escaped = query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { slug: { $regex: escaped, $options: 'i' } },
            ];
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            StoreModel.countDocuments(filter),
            StoreModel.find(filter)
                .populate('category', 'title slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            items: docs.map(toAdminStoreRow),
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    },

    async getStats(): Promise<StoreStats> {
        const [totalStores, pendingStores, blockedStores] = await Promise.all([
            StoreModel.countDocuments(),
            StoreModel.countDocuments({ status: 'pending' }),
            StoreModel.countDocuments({ status: 'blocked' }),
        ]);

        return { totalStores, pendingStores, blockedStores, monthlyRevenue: 0 };
    },

    async getDetail(id: string): Promise<StoreDetail> {
        const store = await StoreModel.findById(id)
            .populate('category', 'title slug')
            .lean();
        if (!store) throw new NotFoundError('Store not found');

        const [user] = await Promise.all([
            UserModel.findById(store.user).select('firstName lastName email avatarUrl').lean(),
        ]);

        let owner: StoreOwnerInfo | null = null;
        if (user) {
            owner = {
                id: user._id?.toString() ?? (user as any).id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`,
                email: (user as any).email ?? '',
                avatarUrl: user.avatarUrl ?? '',
            };
        }

        const categoryDoc = store.category as any;
        return {
            id: store._id?.toString() ?? (store as any).id,
            name: store.name,
            slug: store.slug,
            logo: store.logo ?? '',
            banner: store.banner ?? '',
            description: store.description ?? '',
            category: categoryDoc?._id
                ? { id: categoryDoc._id.toString() ?? categoryDoc.id, title: categoryDoc.title ?? '', slug: categoryDoc.slug ?? '' }
                : null,
            status: store.status ?? 'active',
            totalProducts: store.totalProducts ?? 0,
            revenue: 0,
            followerCount: store.followerCount ?? 0,
            totalReviewCount: store.totalReviewCount ?? 0,
            avgRating: store.avgRating ?? 0,
            responseRate: 0,
            contacts: store.contacts ?? [],
            owner,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
        };
    },

    async toggleStatus(id: string, newStatus: 'active' | 'pending' | 'blocked'): Promise<AdminStoreRow> {
        const update: Record<string, unknown> = { status: newStatus };
        if (newStatus === 'blocked') update.isActive = false;
        else update.isActive = true;

        const store = await StoreModel.findByIdAndUpdate(id, update, { new: true })
            .populate('category', 'title slug')
            .lean();
        if (!store) throw new NotFoundError('Store not found');
        return toAdminStoreRow(store);
    },

    async listAds(storeId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [total, docs] = await Promise.all([
            AdCampaignModel.countDocuments({ store: storeId }),
            AdCampaignModel.find({ store: storeId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const items: AdRow[] = docs.map((d: any) => ({
            id: d._id?.toString() ?? d.id,
            adTitle: d.adTitle ?? '',
            adType: d.adType ?? '',
            price: d.price ?? 0,
            durationDays: d.durationDays ?? 0,
            startDate: d.startDate,
            endDate: d.endDate,
            isActive: d.isActive ?? false,
            createdAt: d.createdAt,
        }));

        return {
            items,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    },

    async listPayments(storeId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [promotedProducts, adCampaigns, totalPromoted, totalAds] = await Promise.all([
            Product.find({ store: storeId, 'promotion.isActive': true })
                .select('promotion title price createdAt')
                .sort({ 'promotion.purchaseDate': -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AdCampaignModel.find({ store: storeId })
                .select('adTitle price durationDays startDate createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments({ store: storeId, 'promotion.isActive': true }),
            AdCampaignModel.countDocuments({ store: storeId }),
        ]);

        const items: PaymentRow[] = [
            ...promotedProducts.map((p: any) => ({
                id: p._id?.toString() ?? p.id,
                packageName: p.title ?? 'Promoted Listing',
                type: 'promotion' as const,
                price: p.promotion?.metadata?.label ? 0 : 0,
                date: p.promotion?.purchaseDate ?? p.createdAt,
            })),
            ...adCampaigns.map((a: any) => ({
                id: a._id?.toString() ?? a.id,
                packageName: a.adTitle ?? 'Ad Campaign',
                type: 'ad' as const,
                price: a.price ?? 0,
                date: a.createdAt,
            })),
        ];

        const total = totalPromoted + totalAds;

        return {
            items,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    },

    async listStoreProducts(storeId: string, query: StoreProductsQuery): Promise<PaginatedStoreProducts> {
        const store = await StoreModel.findById(storeId);
        if (!store) throw new NotFoundError('Store not found');

        const filter: Record<string, unknown> = { store: storeId, isDeleted: { $ne: true } };

        if (query.status !== 'all') {
            filter.status = query.status;
        }

        if (query.search) {
            const escaped = query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            filter.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
            ];
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate('category', 'title slug')
                .select('title price currency status media category viewCount createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const items: StoreProductRow[] = docs.map((doc: any) => ({
            id: doc._id?.toString() ?? doc.id,
            title: doc.title ?? '',
            price: doc.price ?? 0,
            currency: doc.currency ?? 'NOK',
            status: doc.status,
            thumbnail: doc.media?.[0]?.url ?? null,
            category_name: doc.category?.title ?? '',
            created_at: doc.createdAt,
            viewCount: doc.viewCount ?? 0,
        }));

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    },
};
