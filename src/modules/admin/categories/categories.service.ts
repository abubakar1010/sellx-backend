import { NotFoundError } from '@/core/errors';
import { CategoryModel } from '@/modules/categories/category.model';
import { Product } from '@/modules/products/products.model';
import { categoryService } from '@/modules/categories/category.service';
import type { CreateCategoryBody, UpdateCategoryBody } from '@/modules/categories/category.validation';
import type { ICategoryDocument } from '@/modules/categories/category.interface';

interface CategoryWithCounts {
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
    description?: string;
    basicPricing?: number;
    plusPricing?: number;
    sortOrder: number;
    isActive: boolean;
    total_listings: number;
    active_listings: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CategoryStats {
    total_categories: number;
    total_listings: number;
    pending_review: number;
}

function toCategoryWithCounts(
    cat: any,
    counts: Map<string, { total: number; active: number }>,
): CategoryWithCounts {
    const id = cat._id?.toString() ?? cat.id;
    const c = counts.get(id);
    return {
        id,
        title: cat.title,
        slug: cat.slug,
        thumbnail: cat.thumbnail,
        description: cat.description,
        basicPricing: cat.basicPricing,
        plusPricing: cat.plusPricing,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        total_listings: c?.total ?? 0,
        active_listings: c?.active ?? 0,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
    };
}

class AdminCategoriesService {
    async list(): Promise<CategoryWithCounts[]> {
        const [categories, counts] = await Promise.all([
            CategoryModel.find().sort({ sortOrder: 1 }).lean(),
            Product.aggregate([
                { $match: { isDeleted: { $ne: true } } },
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    },
                },
            ]),
        ]);

        const countMap = new Map<string, { total: number; active: number }>();
        for (const c of counts) {
            countMap.set(String(c._id), { total: c.total, active: c.active });
        }

        return categories.map((cat) => toCategoryWithCounts(cat, countMap));
    }

    async getById(id: string): Promise<CategoryWithCounts> {
        const category = await CategoryModel.findById(id).lean();
        if (!category) throw new NotFoundError('Category not found');

        const counts = await Product.aggregate([
            { $match: { isDeleted: { $ne: true }, category: category._id } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                },
            },
        ]);

        const countMap = new Map<string, { total: number; active: number }>();
        for (const c of counts) {
            countMap.set(String(c._id), { total: c.total, active: c.active });
        }

        return toCategoryWithCounts(category, countMap);
    }

    async getStats(): Promise<CategoryStats> {
        const [totalCategories, totalListings, pendingReview] = await Promise.all([
            CategoryModel.countDocuments(),
            Product.countDocuments({ isDeleted: { $ne: true } }),
            Product.countDocuments({ status: 'draft' } as any),
        ]);
        return { total_categories: totalCategories, total_listings: totalListings, pending_review: pendingReview };
    }

    async create(payload: CreateCategoryBody): Promise<ICategoryDocument> {
        return categoryService.createCategory(payload);
    }

    async update(id: string, payload: UpdateCategoryBody): Promise<ICategoryDocument> {
        return categoryService.updateCategory(id, payload);
    }

    async delete(id: string): Promise<void> {
        const existing = await CategoryModel.findById(id).lean();
        if (!existing) throw new NotFoundError('Category not found');
        await CategoryModel.deleteOne({ _id: id });
    }
}

export const adminCategoriesService = new AdminCategoriesService();
