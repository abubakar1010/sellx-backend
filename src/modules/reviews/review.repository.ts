import { ReviewModel, type IReview } from './review.model';

export class ReviewRepository {
    async create(data: Partial<IReview>): Promise<IReview> {
        return ReviewModel.create([data]).then((r) => r[0] as IReview);
    }

    async findById(reviewId: string) {
        return ReviewModel.findById(reviewId).populate('user', 'firstName lastName avatarUrl').lean() as any;
    }

    async findByUserAndTarget(userId: string, targetId: string, targetType: 'user' | 'store') {
        return ReviewModel.findOne({ user: userId, targetId, targetType } as any).lean() as any;
    }

    async findByTarget(targetId: string, targetType: 'user' | 'store', page: number, limit: number) {
        const skip = (page - 1) * limit;
        const filter = { targetId, targetType } as any;
        const [total, data] = await Promise.all([
            ReviewModel.countDocuments(filter),
            ReviewModel.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean() as any,
        ]);

        return { data, total };
    }

    async delete(reviewId: string) {
        return ReviewModel.findByIdAndDelete(reviewId);
    }

    async updateById(
        reviewId: string,
        data: Partial<IReview>,
    ) {
        return ReviewModel.findByIdAndUpdate(reviewId, { $set: data }, { new: true })
            .populate('user', 'firstName lastName avatarUrl')
            .lean() as any;
    }

    async findReceivedByUserPaginated(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const filter = { targetId: userId, targetType: 'user' } as any;
        const [total, data] = await Promise.all([
            ReviewModel.countDocuments(filter),
            ReviewModel.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean() as any,
        ]);
        return { data, total };
    }

    async findReceivedByStorePaginated(storeId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const filter = { targetId: storeId, targetType: 'store' } as any;
        const [total, data] = await Promise.all([
            ReviewModel.countDocuments(filter),
            ReviewModel.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean() as any,
        ]);
        return { data, total };
    }

    async findGivenByUserPaginated(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const filter = { user: userId } as any;
        const [total, data] = await Promise.all([
            ReviewModel.countDocuments(filter),
            ReviewModel.find(filter)
                .populate('user', 'firstName lastName avatarUrl')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean() as any,
        ]);
        return { data, total };
    }

    async findRecentByTarget(targetId: string, targetType: string, limit: number) {
        return ReviewModel.find({ targetId, targetType } as any)
            .populate('user', 'firstName lastName avatarUrl')
            .sort('-createdAt')
            .limit(limit)
            .lean() as any;
    }

    async countPositiveFeedback(targetId: string, targetType: string) {
        const [total, positive] = await Promise.all([
            ReviewModel.countDocuments({ targetId, targetType } as any),
            ReviewModel.countDocuments({ targetId, targetType, rating: { $gte: 4 } } as any),
        ]);
        return { total, positive };
    }

    async calculateStats(targetId: string, targetType: 'user' | 'store') {
        const filter = { targetId, targetType } as any;
        const reviews = await ReviewModel.find(filter).lean() as any[];
        if (reviews.length === 0) {
            return { avgRating: 0, totalReviewCount: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        }

        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = Math.round((sum / total) * 10) / 10;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            distribution[r.rating as keyof typeof distribution]++;
        });

        const distributionPercent = {
            1: Math.round((distribution[1] / total) * 100),
            2: Math.round((distribution[2] / total) * 100),
            3: Math.round((distribution[3] / total) * 100),
            4: Math.round((distribution[4] / total) * 100),
            5: Math.round((distribution[5] / total) * 100),
        };

        return { avgRating, totalReviewCount: total, distribution: distributionPercent };
    }
}

export const reviewRepository = new ReviewRepository();