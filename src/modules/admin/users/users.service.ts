import { NotFoundError } from '@/core/errors';
import { UserModel } from '@/modules/user/user.model';
import { Product } from '@/modules/products/products.model';
import { StoreModel } from '@/modules/stores/store.model';
import { CategoryModel } from '@/modules/categories/category.model';
import type { AdminUsersQuery } from './users.validation';

interface AdminUserRow {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    totalProducts: number;
    avgRating: number;
    status: string;
    createdAt?: Date;
}

interface PaginatedAdminUsers {
    items: AdminUserRow[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface UserProductsQuery {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

interface UserProductRow {
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

interface PaginatedUserProducts {
    items: UserProductRow[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface UserStats {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
}

interface LastProduct {
    id: string;
    title: string;
    thumbnail: string;
    viewCount: number;
    createdAt?: Date;
}

interface StoreInfo {
    id: string;
    name: string;
    logo?: string;
    category: {
        id: string;
        title: string;
        slug: string;
    } | null;
    lastProduct: LastProduct | null;
}

interface UserDetail {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    bio?: string;
    status: string;
    address: string | null;
    totalProducts: number;
    totalTransactions: number;
    avgRating: number;
    store: StoreInfo | null;
    createdAt?: Date;
    updatedAt?: Date;
}

function toAdminUserRow(doc: any): AdminUserRow {
    return {
        id: doc._id?.toString() ?? doc.id,
        firstName: doc.firstName ?? '',
        lastName: doc.lastName ?? '',
        fullName: `${doc.firstName ?? ''} ${doc.lastName ?? ''}`.trim() || 'Unknown',
        email: doc.email ?? '',
        avatarUrl: doc.avatarUrl,
        totalProducts: doc.totalProducts ?? 0,
        avgRating: doc.avgRating ?? 0,
        status: doc.status,
        createdAt: doc.createdAt,
    };
}

export const adminUsersService = {
    async list(query: AdminUsersQuery): Promise<PaginatedAdminUsers> {
        const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

        if (query.filter === 'active') filter.status = 'active';
        else if (query.filter === 'blocked') filter.status = 'blocked';

        if (query.search) {
            const escaped = query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            filter.$or = [
                { firstName: { $regex: escaped, $options: 'i' } },
                { lastName: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ];
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            UserModel.countDocuments(filter),
            UserModel.find(filter)
                .select(
                    'firstName lastName email avatarUrl totalProducts avgRating status createdAt',
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            items: docs.map(toAdminUserRow),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    },

    async getStats(): Promise<UserStats> {
        const [totalUsers, activeUsers, blockedUsers] = await Promise.all([
            UserModel.countDocuments({ isDeleted: { $ne: true } }),
            UserModel.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
            UserModel.countDocuments({ isDeleted: { $ne: true }, status: 'blocked' }),
        ]);

        return { totalUsers, activeUsers, blockedUsers };
    },

    async toggleStatus(id: string, newStatus: 'active' | 'blocked'): Promise<AdminUserRow> {
        const user = await UserModel.findByIdAndUpdate(
            id,
            { status: newStatus },
            { new: true },
        ).lean();

        if (!user) throw new NotFoundError('User not found');
        return toAdminUserRow(user);
    },

    async getDetail(id: string): Promise<UserDetail> {
        const user = await UserModel.findById(id).lean();
        if (!user) throw new NotFoundError('User not found');

        const [store, totalProducts] = await Promise.all([
            StoreModel.findOne({ user: id }).select('name logo category').lean(),
            Product.countDocuments({ user: id, isDeleted: { $ne: true } }),
        ]);

        let storeInfo: StoreInfo | null = null;
        if (store && store.category) {
            const category = await CategoryModel.findById(store.category)
                .select('title slug')
                .lean();

            const lastProductDoc = await Product.findOne({
                store: store._id,
                isDeleted: { $ne: true },
            })
                .select('title media viewCount createdAt')
                .sort({ createdAt: -1 })
                .lean();

            storeInfo = {
                id: store._id?.toString() ?? (store as any).id,
                name: store.name,
                logo: store.logo,
                category: category
                    ? {
                          id: category._id?.toString() ?? (category as any).id,
                          title: category.title,
                          slug: category.slug,
                      }
                    : null,
                lastProduct: lastProductDoc
                    ? {
                          id: lastProductDoc._id?.toString() ?? (lastProductDoc as any).id,
                          title: lastProductDoc.title ?? '',
                          thumbnail: (lastProductDoc as any).media?.[0]?.url ?? '',
                          viewCount: lastProductDoc.viewCount ?? 0,
                          createdAt: lastProductDoc.createdAt,
                      }
                    : null,
            };
        }

        return {
            id: user._id?.toString() ?? (user as any).id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            status: user.status,
            address: user.address ?? null,
            totalProducts,
            totalTransactions: user.soldItemsCount ?? 0,
            avgRating: user.avgRating ?? 0,
            store: storeInfo,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    },

    async listUserProducts(
        userId: string,
        query: UserProductsQuery,
    ): Promise<PaginatedUserProducts> {
        const user = await UserModel.findById(userId);
        if (!user) throw new NotFoundError('User not found');

        const filter: Record<string, unknown> = { user: userId, isDeleted: { $ne: true } };

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

        const page = Math.max(1, query?.page || 1);
        const limit = Math.min(50, Math.max(1, query?.limit || 10));
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

        const items: UserProductRow[] = docs.map((doc: any) => ({
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
