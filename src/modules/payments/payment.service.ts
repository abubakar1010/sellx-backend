import { PaymentTransactionModel } from './payment.model';
import type { ListPaymentsQuery } from './payment.validation';

interface PaymentRow {
    id: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string;
    } | null;
    paymentType: string;
    amount: number;
    currency: string;
    date?: Date;
    status: string;
    description?: string;
}

interface PaymentTypeStats {
    amount: number;
    percentage: number;
}

interface PaymentStats {
    totalEarnings: number;
    totalTransactions: number;
    boost: PaymentTypeStats;
    story: PaymentTypeStats;
    listing: PaymentTypeStats;
    subscription: PaymentTypeStats;
    ad: PaymentTypeStats;
}

export const paymentService = {
    async list(query: ListPaymentsQuery) {
        const filter: Record<string, unknown> = {};

        if (query.paymentType) filter.paymentType = query.paymentType;
        if (query.status) filter.status = query.status;
        if (query.search) {
            const escaped = query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            filter.$or = [
                { email: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
            ];
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            PaymentTransactionModel.countDocuments(filter),
            PaymentTransactionModel.find(filter)
                .populate('user', 'firstName lastName email avatarUrl')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const items: PaymentRow[] = docs.map((d: any) => {
            const user = d.user ?? {};
            return {
                id: d._id?.toString() ?? d.id,
                user: user._id
                    ? {
                          id: user._id?.toString() ?? user.id,
                          firstName: user.firstName ?? '',
                          lastName: user.lastName ?? '',
                          email: user.email ?? d.email ?? '',
                          avatarUrl: user.avatarUrl,
                      }
                    : null,
                paymentType: d.paymentType ?? '',
                amount: d.amount ?? 0,
                currency: d.currency ?? 'USD',
                date: d.createdAt,
                status: d.status ?? 'pending',
                description: d.description,
            };
        });

        return {
            items,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
        };
    },

    async getStats(): Promise<PaymentStats> {
        const [stats] = await PaymentTransactionModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$amount' },
                    boostRevenue: { $sum: { $cond: [{ $eq: ['$paymentType', 'boost'] }, '$amount', 0] } },
                    storyRevenue: { $sum: { $cond: [{ $eq: ['$paymentType', 'story'] }, '$amount', 0] } },
                    listingRevenue: { $sum: { $cond: [{ $eq: ['$paymentType', 'listing'] }, '$amount', 0] } },
                    subscriptionRevenue: { $sum: { $cond: [{ $eq: ['$paymentType', 'subscription'] }, '$amount', 0] } },
                    adRevenue: { $sum: { $cond: [{ $eq: ['$paymentType', 'ad'] }, '$amount', 0] } },
                    totalTransactions: { $sum: 1 },
                },
            },
        ]);

        if (!stats) {
            return {
                totalEarnings: 0,
                totalTransactions: 0,
                boost: { amount: 0, percentage: 0 },
                story: { amount: 0, percentage: 0 },
                listing: { amount: 0, percentage: 0 },
                subscription: { amount: 0, percentage: 0 },
                ad: { amount: 0, percentage: 0 },
            };
        }

        const total = stats.totalEarnings || 0;
        const calcPct = (val: number) => (total > 0 ? Math.round((val / total) * 100 * 100) / 100 : 0);

        return {
            totalEarnings: stats.totalEarnings ?? 0,
            totalTransactions: stats.totalTransactions ?? 0,
            boost: { amount: stats.boostRevenue ?? 0, percentage: calcPct(stats.boostRevenue ?? 0) },
            story: { amount: stats.storyRevenue ?? 0, percentage: calcPct(stats.storyRevenue ?? 0) },
            listing: { amount: stats.listingRevenue ?? 0, percentage: calcPct(stats.listingRevenue ?? 0) },
            subscription: { amount: stats.subscriptionRevenue ?? 0, percentage: calcPct(stats.subscriptionRevenue ?? 0) },
            ad: { amount: stats.adRevenue ?? 0, percentage: calcPct(stats.adRevenue ?? 0) },
        };
    },
};
