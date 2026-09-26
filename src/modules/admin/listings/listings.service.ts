import { NotFoundError } from '@/core/errors';
import { Product } from '@/modules/products/products.model';
import { productService } from '@/modules/products/product.service';
import type { AdminListingsQuery } from './listings.validation';
import { escapeRegex } from '@shared/utils/escapeRegex';

interface AdminListingRow {
    id: string;
    title: string;
    price: number;
    status: string;
    thumbnail: string | null;
    category_name: string;
    seller_name: string;
    seller_avatar: string;
    created_at: Date;
}

interface PaginatedAdminListings {
    items: AdminListingRow[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

function toAdminRow(doc: any): AdminListingRow {
    const seller = doc.user ?? {};
    const category = doc.category ?? {};
    const media = doc.media ?? [];
    return {
        id: doc._id?.toString() ?? doc.id,
        title: doc.title ?? '',
        price: doc.price ?? 0,
        status: doc.status,
        thumbnail: media.length > 0 ? media[0]?.url ?? null : null,
        category_name: category.title ?? '',
        seller_name: `${seller.firstName ?? ''} ${seller.lastName ?? ''}`.trim() || 'Unknown',
        seller_avatar: seller.avatarUrl ?? '',
        created_at: doc.createdAt,
    };
}

class AdminListingsService {
    async getOverview(): Promise<{
        pending: number;
        active: number;
        sold_today: number;
        rejected: number;
        expired: number;
    }> {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [pending, active, rejected, soldToday, expired] = await Promise.all([
            Product.countDocuments({ status: 'draft' } as any),
            Product.countDocuments({ status: 'active' } as any),
            Product.countDocuments({ status: 'rejected' } as any),
            Product.countDocuments({ status: 'sold', updatedAt: { $gte: startOfToday } } as any),
            Product.countDocuments({ status: 'expired' } as any),
        ]);

        return { pending, active, sold_today: soldToday, rejected, expired };
    }

    async list(query: AdminListingsQuery): Promise<PaginatedAdminListings> {
        const filter: Record<string, unknown> = {};

        if (query.status === 'pending') filter.status = 'draft';
        else if (query.status === 'active') filter.status = 'active';
        else if (query.status === 'rejected') filter.status = 'rejected';
        else if (query.status === 'sold') filter.status = 'sold';
        else if (query.status === 'expired') filter.status = 'expired';

        if (query.search) {
            filter.$or = [
                { title: { $regex: escapeRegex(query.search), $options: 'i' } },
                { description: { $regex: escapeRegex(query.search), $options: 'i' } },
            ];
        }

        if (query.category) {
            filter.category = query.category;
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .populate('category', 'title slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            items: docs.map(toAdminRow),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async deleteProduct(id: string) {
        const existing = await Product.findById(id);
        if (!existing) throw new NotFoundError('Product not found');

        await Product.findByIdAndUpdate(id, {
            isDeleted: true,
            deletedAt: new Date(),
            status: 'deleted',
        });
    }

    async updateStatus(id: string, status: 'active' | 'rejected', rejectionReason?: string) {
        if (status === 'active') {
            return productService.approveProduct(id);
        }
        return productService.rejectProduct(id, rejectionReason);
    }
}

export const adminListingsService = new AdminListingsService();
