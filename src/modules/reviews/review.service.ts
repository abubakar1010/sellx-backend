import { NotFoundError, ConflictError, ForbiddenError } from '@core/errors';
import { reviewRepository } from './review.repository';
import { storeRepository } from '../stores/store.repository';
import { UserModel } from '../user/user.model';
import type {
    CreateReviewBody,
    ReviewQuery,
    UpdateReviewBody,
    MyReviewsQuery,
    StoreReviewsQuery,
} from './review.validation';
import type { Types } from 'mongoose';
import { serializeReview } from './review.serializer';

export class ReviewService {
    async createReview(userId: string, body: CreateReviewBody) {
        const existing = await reviewRepository.findByUserAndTarget(
            userId,
            body.targetId,
            body.targetType,
        );
        if (existing) {
            throw new ConflictError(
                'You have already reviewed this ' + body.targetType,
                'REVIEW_EXISTS',
            );
        }

        if (body.targetType === 'user') {
            const targetExists = await UserModel.exists({ _id: body.targetId, isDeleted: false });
            if (!targetExists) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
        } else {
            const targetExists = await storeRepository.findById(body.targetId);
            if (!targetExists) throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
        }

        const review = await reviewRepository.create({
            user: userId as any,
            targetId: body.targetId as any,
            targetType: body.targetType,
            rating: body.rating,
            feedback: body.feedback,
        });

        await this.updateTargetStats(body.targetId, body.targetType);
        return review;
    }

    async getReviews(query: ReviewQuery) {
        const { data, total } = await reviewRepository.findByTarget(
            query.targetId,
            query.targetType,
            query.page,
            query.limit,
        );

        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
                hasNextPage: query.page < Math.ceil(total / query.limit),
                hasPrevPage: query.page > 1,
            },
        };
    }

    async getMyReviewsOverview(userId: string) {
        const user = (await UserModel.findById(userId).lean()) as any;
        if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

        const { total, positive } = await reviewRepository.countPositiveFeedback(userId, 'user');
        const positiveFeedbackPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
        const trustScore = user.totalReviewCount > 0 ? Math.round((user.avgRating / 5) * 100) : 0;
        const isTrusted = trustScore > 85;

        const recentReviews = await reviewRepository.findRecentByTarget(userId, 'user', 5);

        return {
            avgRating: user.avgRating,
            totalReviewCount: user.totalReviewCount,
            trustScore,
            isTrusted,
            soldItemsCount: user.soldItemsCount,
            totalProducts: user.totalProducts,
            positiveFeedbackPercent,
            respondsWithinMinutes: null,
            recentReviews: recentReviews.map((r: any) => serializeReview(r)),
        };
    }

    async getUserReviewsOverview(userId: string) {
        const user = (await UserModel.findById(userId).lean()) as any;
        if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

        const { total, positive } = await reviewRepository.countPositiveFeedback(userId, 'user');
        const positiveFeedbackPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
        const trustScore = user.totalReviewCount > 0 ? Math.round((user.avgRating / 5) * 100) : 0;
        const isTrusted = trustScore > 85;

        return {
            avgRating: user.avgRating ?? 0,
            totalReviewCount: user.totalReviewCount ?? 0,
            ratingDistribution: user.ratingDistribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            trustScore,
            isTrusted,
            positiveFeedbackPercent,
            respondsWithinMinutes: null,
            totalProducts: user.totalProducts ?? 0,
            soldItemsCount: user.soldItemsCount ?? 0,
        };
    }

    async getReceivedReviews(userId: string, query: MyReviewsQuery) {
        const { data, total } = await reviewRepository.findReceivedByUserPaginated(
            userId,
            query.page,
            query.limit,
        );
        return {
            data: data.map((r: any) => serializeReview(r)),
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
                hasNextPage: query.page < Math.ceil(total / query.limit),
                hasPrevPage: query.page > 1,
            },
        };
    }

    async getGivenReviews(userId: string, query: MyReviewsQuery) {
        const { data, total } = await reviewRepository.findGivenByUserPaginated(
            userId,
            query.page,
            query.limit,
        );
        return {
            data: data.map((r: any) => serializeReview(r)),
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
                hasNextPage: query.page < Math.ceil(total / query.limit),
                hasPrevPage: query.page > 1,
            },
        };
    }

    async updateReview(userId: string, reviewId: string, data: UpdateReviewBody) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) throw new NotFoundError('Review not found', 'REVIEW_NOT_FOUND');
        if ((review.user as any)._id.toString() !== userId) {
            throw new ForbiddenError('Not authorized to update this review', 'FORBIDDEN');
        }

        const updated = await reviewRepository.updateById(reviewId, data);

        const targetId = review.targetId.toString();
        const targetType = review.targetType;
        await this.updateTargetStats(targetId, targetType);

        return updated;
    }

    async getStoreReviewsOverview(storeId: string) {
        const store = await storeRepository.findByIdWithPopulate(storeId, 'category');
        if (!store) throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');

        const { total, positive } = await reviewRepository.countPositiveFeedback(storeId, 'store');
        const positiveFeedbackPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
        const trustScore = store.avgRating > 0 ? Math.round((store.avgRating / 5) * 100) : 0;
        const isTrusted = trustScore > 85;

        const recentReviews = await reviewRepository.findRecentByTarget(storeId, 'store', 5);

        return {
            avgRating: store.avgRating,
            totalReviewCount: store.totalReviewCount,
            trustScore,
            isTrusted,
            totalProducts: store.totalProducts,
            followerCount: store.followerCount,
            positiveFeedbackPercent,
            respondsWithinMinutes: null,
            recentReviews: recentReviews.map((r: any) => serializeReview(r)),
        };
    }

    async getReceivedReviewsForStore(storeId: string, query: StoreReviewsQuery) {
        const { data, total } = await reviewRepository.findReceivedByStorePaginated(
            storeId,
            query.page,
            query.limit,
        );
        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
                hasNextPage: query.page < Math.ceil(total / query.limit),
                hasPrevPage: query.page > 1,
            },
        };
    }

    async deleteReview(userId: string, reviewId: string) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) throw new NotFoundError('Review not found', 'REVIEW_NOT_FOUND');
        if ((review.user as any)._id.toString() !== userId) {
            throw new ForbiddenError('Not authorized to delete this review', 'FORBIDDEN');
        }

        const targetId = review.targetId.toString();
        const targetType = review.targetType;

        await reviewRepository.delete(reviewId);
        await this.updateTargetStats(targetId, targetType);
    }

    private async updateTargetStats(targetId: string, targetType: 'user' | 'store') {
        const stats = await reviewRepository.calculateStats(targetId, targetType);

        if (targetType === 'user') {
            await UserModel.findByIdAndUpdate(targetId, {
                avgRating: stats.avgRating,
                totalReviewCount: stats.totalReviewCount,
                ratingDistribution: stats.distribution,
            });
        } else {
            await storeRepository.updateById(targetId, {
                avgRating: stats.avgRating,
                totalReviewCount: stats.totalReviewCount,
            });
        }
    }
}

export const reviewService = new ReviewService();