import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors';
import type { OffsetPaginationMeta } from '@/core/types/pagination.types';
import type { CreateStoryBody, ListStoriesQuery, UpdateStoryBody } from './story.validation';
import type { IStoryDocument } from './story.interface';
import { storyRepository } from './story.repository';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { storyPurchaseRepository } from '@/modules/story-purchase/story-purchase.repository';

export interface StoryGroup {
    user: { id: string; firstName: string; lastName: string; avatarUrl?: string } | null;
    store: { id: string; name: string; logo?: string } | null;
    stories: IStoryDocument[];
}

const groupStories = (stories: IStoryDocument[]): StoryGroup[] => {
    const map = new Map<string, StoryGroup>();

    for (const story of stories) {
        const storyUser = (story as any).user;
        const storyStore = (story as any).store;
        const key = storyStore ? `store:${storyStore._id ?? storyStore.id}` : `user:${storyUser._id ?? storyUser.id}`;

        if (!map.has(key)) {
            map.set(key, {
                user: storyStore ? null : storyUser ? { id: storyUser.id ?? String(storyUser._id ?? ''), firstName: storyUser.firstName, lastName: storyUser.lastName, avatarUrl: storyUser.avatarUrl } : null,
                store: storyStore ? { id: storyStore.id ?? String(storyStore._id ?? ''), name: storyStore.name, logo: storyStore.logo } : null,
                stories: [],
            });
        }

        map.get(key)!.stories.push(story);
    }

    return Array.from(map.values()).sort((a, b) => {
        const aLatest = a.stories[0]?.createdAt;
        const bLatest = b.stories[0]?.createdAt;
        return new Date(bLatest!).getTime() - new Date(aLatest!).getTime();
    });
};

export class StoryService {
    async createStory(
        payload: CreateStoryBody,
        files: Express.Multer.File[],
        userId: string,
        storeId?: string,
    ): Promise<IStoryDocument[]> {
        const fileCount = files.length;

        // Stories always require a per-use purchase
        const purchase = await storyPurchaseRepository.findById(payload.purchaseId);
        if (!purchase) throw new NotFoundError('Story purchase not found');
        if (String((purchase as any).user) !== userId) {
            throw new ForbiddenError('This purchase does not belong to you');
        }
        if (purchase.status !== 'active') {
            throw new BadRequestError('All story slots in this purchase have been used');
        }
        if (purchase.expiresAt <= new Date()) {
            throw new BadRequestError('This purchase has expired');
        }

        const remaining = purchase.packageSnapshot.maxStories - purchase.storiesUsed;
        if (remaining < fileCount) {
            throw new BadRequestError(
                `Not enough remaining slots. You have ${remaining} slot${remaining === 1 ? '' : 's'} but are uploading ${fileCount} file${fileCount === 1 ? '' : 's'}`,
            );
        }

        // Atomically consume story slots
        const updated = await storyPurchaseRepository.consumeStorySlots(
            payload.purchaseId,
            userId,
            fileCount,
        );
        if (!updated) {
            throw new BadRequestError('Insufficient story slots or purchase expired');
        }

        // Derive expiration from the purchased package
        const now = new Date();
        const expireHours = purchase.packageSnapshot.durationHours;
        const expiresAt = new Date(now.getTime() + expireHours * 60 * 60 * 1000);

        const created = await Promise.all(
            files.map(async (file) => {
                const data: Record<string, unknown> = {
                    user: userId,
                    purchase: payload.purchaseId,
                    media: getFileUrl(file.filename, 'stories'),
                    texts: payload.texts ?? [],
                    expireIn: expireHours,
                    expiresAt,
                    viewCount: 0,
                    views: [],
                };

                if (storeId) data.store = storeId;
                if (payload.product) data.product = payload.product;

                return storyRepository.create(data as any);
            }),
        );

        // Mark purchase as exhausted if all slots used
        if (updated.storiesUsed >= updated.packageSnapshot.maxStories) {
            await storyPurchaseRepository.markExhausted(payload.purchaseId);
        }

        const ids = created.map((s) => (s as any)._id ?? s.id);
        return storyRepository.findByIds(ids);
    }

    async listStories(
        query: ListStoriesQuery,
    ): Promise<{ groups: StoryGroup[]; meta: OffsetPaginationMeta }> {
        const filter: Record<string, unknown> = {};

        if (query.userId) filter.user = query.userId;
        if (query.storeId) filter.store = query.storeId;

        const result = await storyRepository.findAllActiveGrouped(
            filter,
            { page: query.page ?? 1, limit: query.limit ?? 20, sort: '-createdAt' },
        );

        return { groups: groupStories(result.data), meta: result.meta };
    }

    async getStory(
        storyId: string,
        viewerId?: string,
    ): Promise<IStoryDocument> {
        const story = await storyRepository.findActiveById(storyId);
        if (!story) throw new NotFoundError('Story not found');

        if (viewerId && String(story.user) !== viewerId) {
            await storyRepository.addView(storyId, viewerId);
        }

        return story;
    }

    async updateStory(
        storyId: string,
        userId: string,
        payload: UpdateStoryBody,
    ): Promise<IStoryDocument> {
        const existing = await storyRepository.findById(storyId);
        if (!existing) throw new NotFoundError('Story not found');
        if (String((existing as any).user) !== userId) {
            throw new ForbiddenError('You can only update your own story');
        }

        const updateData: Record<string, unknown> = {};

        if (payload.texts !== undefined) updateData.texts = payload.texts;
        if (payload.product !== undefined) updateData.product = payload.product;

        const updated = await storyRepository.updateById(storyId, updateData as any);
        if (!updated) throw new NotFoundError('Story not found');

        const populated = await storyRepository.findByIds([storyId]);
        if (!populated.length) throw new NotFoundError('Story not found');
        return populated[0] as IStoryDocument;
    }

    async deleteStory(storyId: string, userId: string): Promise<void> {
        const deleted = await storyRepository.softDelete(storyId, userId);
        if (!deleted) {
            const story = await storyRepository.findById(storyId);
            if (!story) throw new NotFoundError('Story not found');
            throw new ForbiddenError('You can only delete your own story');
        }
    }
}

export const storyService = new StoryService();
