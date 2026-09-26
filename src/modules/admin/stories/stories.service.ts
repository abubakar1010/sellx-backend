import mongoose from 'mongoose';
import { StoryModel } from '@/modules/stories/story.model';
import type { AdminStoriesQuery } from './stories.validation';

interface AdminStoryRow {
    id: string;
    user: { id: string; firstName: string; lastName: string; avatarUrl?: string } | null;
    store: { id: string; name: string; logo?: string } | null;
    media: string;
    title: string;
    product: { id: string; title: string } | null;
    expiresAt?: Date;
    expireHoursLeft: number;
    viewCount: number;
    createdAt?: Date;
}

function calculateExpireHoursLeft(expiresAt: Date): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60)));
}

export const adminStoriesService = {
    async list(query: AdminStoriesQuery) {
        const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

        if (query.isActive === true) {
            filter.expiresAt = { $gt: new Date() };
        }

        if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
            filter.user = new mongoose.Types.ObjectId(query.userId);
        }

        if (query.search) {
            const escaped = query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            filter.$or = [
                { 'texts.text': { $regex: escaped, $options: 'i' } },
            ];
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const sortOrder: Record<string, 1 | -1> = query.isActive ? { expiresAt: 1 } : { createdAt: -1 };

        const [total, docs] = await Promise.all([
            StoryModel.countDocuments(filter),
            StoryModel.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .populate('store', 'name logo')
                .populate('product', 'title')
                .sort(sortOrder)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const items: AdminStoryRow[] = docs.map((d: any) => ({
            id: d._id?.toString() ?? d.id,
            user: d.user
                ? {
                      id: d.user._id?.toString() ?? d.user.id,
                      firstName: d.user.firstName ?? '',
                      lastName: d.user.lastName ?? '',
                      avatarUrl: d.user.avatarUrl,
                  }
                : null,
            store: d.store
                ? {
                      id: d.store._id?.toString() ?? d.store.id,
                      name: d.store.name ?? '',
                      logo: d.store.logo,
                  }
                : null,
            media: d.media ?? '',
            title: d.texts?.length ? d.texts[0].text : '',
            product: d.product
                ? {
                      id: d.product._id?.toString() ?? d.product.id,
                      title: d.product.title ?? '',
                  }
                : null,
            expiresAt: d.expiresAt,
            expireHoursLeft: calculateExpireHoursLeft(d.expiresAt),
            viewCount: d.viewCount ?? 0,
            createdAt: d.createdAt,
        }));

        return {
            items,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    },

    async getStats() {
        const now = new Date();
        const [totalStories, activeStories, expiredStories] = await Promise.all([
            StoryModel.countDocuments({ isDeleted: { $ne: true } }),
            StoryModel.countDocuments({ isDeleted: { $ne: true }, expiresAt: { $gt: now } }),
            StoryModel.countDocuments({ isDeleted: { $ne: true }, expiresAt: { $lte: now } }),
        ]);
        return { totalStories, activeStories, expiredStories };
    },
};
