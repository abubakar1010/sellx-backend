import type { IReviewDocument } from './review.interface';

export const serializeReview = (review: IReviewDocument | any) => ({
    id: review._id,
    user: review.user ? { id: review.user._id, firstName: review.user.firstName, lastName: review.user.lastName, avatarUrl: review.user.avatarUrl } : null,
    targetId: review.targetId,
    targetType: review.targetType,
    rating: review.rating,
    feedback: review.feedback,
    createdAt: review.createdAt,
});