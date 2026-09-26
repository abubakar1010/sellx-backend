import type { PipelineStage } from 'mongoose';
import { Product as ProductModel } from '@/modules/products/products.model';
import { UserModel } from '@/modules/user/user.model';
import { StoreModel } from '@/modules/stores/store.model';
import type { DashboardSummaryQuery } from './dashboard.validation';

interface KpiMetric {
    value: number;
    change: number;
    change_type?: 'absolute';
}

interface GrowthAnalytics {
    timespan: 'monthly' | 'yearly';
    labels: string[];
    datasets: {
        label: string;
        data: number[];
    }[];
}

interface TopCategory {
    name: string;
    percentage: number;
}

interface DashboardSummary {
    kpi_metrics: {
        total_listings: KpiMetric;
        active_listings: KpiMetric;
        total_users: KpiMetric;
        total_stores: KpiMetric;
        revenue: KpiMetric;
        pending_approvals: KpiMetric;
    };
    growth_analytics: GrowthAnalytics;
    top_categories: TopCategory[];
}

const MONTH_NAMES = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
] as const;

class DashboardService {
    async getSummary(query: DashboardSummaryQuery): Promise<DashboardSummary> {
        const [kpiMetrics, growthAnalytics, topCategories] = await Promise.all([
            this.getKpiMetrics(),
            this.getGrowthAnalytics(query.timespan),
            this.getTopCategories(),
        ]);

        return {
            kpi_metrics: kpiMetrics,
            growth_analytics: growthAnalytics,
            top_categories: topCategories,
        };
    }

    private async getKpiMetrics() {
        const now = new Date();
        const prevDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const productBaseFilter = { isDeleted: { $ne: true } };
        const userBaseFilter = { isDeleted: { $ne: true } };

        const [
            totalListings,
            totalListingsPrev,
            activeListings,
            activeListingsPrev,
            totalUsers,
            totalUsersPrev,
            totalStores,
            totalStoresPrev,
            pendingApprovals,
            pendingApprovalsPrev,
        ] = await Promise.all([
            ProductModel.countDocuments(productBaseFilter),
            ProductModel.countDocuments({ ...productBaseFilter, createdAt: { $lt: prevDate } }),
            ProductModel.countDocuments({ ...productBaseFilter, status: 'active' } as any),
            ProductModel.countDocuments({
                ...productBaseFilter,
                status: 'active',
                createdAt: { $lt: prevDate },
            } as any),
            UserModel.countDocuments(userBaseFilter),
            UserModel.countDocuments({ ...userBaseFilter, createdAt: { $lt: prevDate } }),
            StoreModel.countDocuments(),
            StoreModel.countDocuments({ createdAt: { $lt: prevDate } }),
            ProductModel.countDocuments({ ...productBaseFilter, status: 'draft' } as any),
            ProductModel.countDocuments({
                ...productBaseFilter,
                status: 'draft',
                createdAt: { $lt: prevDate },
            } as any),
        ]);

        const revenue = 0;
        const revenuePrev = 0;

        return {
            total_listings: {
                value: totalListings,
                change: this.calcPercentChange(totalListings, totalListingsPrev),
            },
            active_listings: {
                value: activeListings,
                change: this.calcPercentChange(activeListings, activeListingsPrev),
            },
            total_users: {
                value: totalUsers,
                change: this.calcPercentChange(totalUsers, totalUsersPrev),
            },
            total_stores: {
                value: totalStores,
                change: this.calcPercentChange(totalStores, totalStoresPrev),
            },
            revenue: {
                value: revenue,
                change: this.calcPercentChange(revenue, revenuePrev),
            },
            pending_approvals: {
                value: pendingApprovals,
                change: pendingApprovals - pendingApprovalsPrev,
                change_type: 'absolute' as const,
            },
        };
    }

    private async getGrowthAnalytics(timespan: 'monthly' | 'yearly'): Promise<GrowthAnalytics> {
        const now = new Date();

        if (timespan === 'monthly') {
            const startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 6);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            const pipeline: PipelineStage[] = [
                { $match: { isDeleted: { $ne: true }, createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                        listings: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ];

            const listingData = await ProductModel.aggregate(pipeline);
            return this.buildMonthlyChart(now, listingData);
        }

        const startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 6);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);

        const pipeline: PipelineStage[] = [
            { $match: { isDeleted: { $ne: true }, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' } },
                    listings: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1 } },
        ];

        const listingData = await ProductModel.aggregate(pipeline);
        return this.buildYearlyChart(now, listingData);
    }

    private buildMonthlyChart(
        now: Date,
        listingData: { _id: { year: number; month: number }; listings: number }[],
    ): GrowthAnalytics {
        const labels: string[] = [];
        const listingsData: number[] = [];

        const lookup = new Map<string, number>();
        for (const d of listingData) {
            lookup.set(`${d._id.year}-${d._id.month}`, d.listings);
        }

        const start = new Date(now);
        start.setMonth(start.getMonth() - 6);
        start.setDate(1);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setMonth(d.getMonth() + i);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            labels.push(MONTH_NAMES[d.getMonth()]!);
            listingsData.push(lookup.get(key) ?? 0);
        }

        return {
            timespan: 'monthly',
            labels,
            datasets: [
                { label: 'Listings', data: listingsData },
                { label: 'Revenue', data: new Array(7).fill(0) },
            ],
        };
    }

    private buildYearlyChart(
        now: Date,
        listingData: { _id: { year: number }; listings: number }[],
    ): GrowthAnalytics {
        const labels: string[] = [];
        const listingsData: number[] = [];

        const lookup = new Map<number, number>();
        for (const d of listingData) {
            lookup.set(d._id.year, d.listings);
        }

        const startYear = now.getFullYear() - 6;
        for (let i = 0; i < 7; i++) {
            const year = startYear + i;
            labels.push(String(year));
            listingsData.push(lookup.get(year) ?? 0);
        }

        return {
            timespan: 'yearly',
            labels,
            datasets: [
                { label: 'Listings', data: listingsData },
                { label: 'Revenue', data: new Array(7).fill(0) },
            ],
        };
    }

    private async getTopCategories(): Promise<TopCategory[]> {
        const totalActive = await ProductModel.countDocuments({
            status: 'active',
            isDeleted: { $ne: true },
        } as any);

        if (totalActive === 0) return [];

        const pipeline: PipelineStage[] = [
            { $match: { status: 'active', isDeleted: { $ne: true } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 4 },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: ['$category.title', 'Unknown'] },
                    count: 1,
                },
            },
        ];

        const results = await ProductModel.aggregate(pipeline);

        return results.map((r: { name: string; count: number }) => ({
            name: r.name,
            percentage: Math.round((r.count / totalActive) * 100),
        }));
    }

    private calcPercentChange(current: number, previous: number): number {
        if (previous === 0) {
            if (current === 0) return 0;
            return 100;
        }
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    }
}

export const dashboardService = new DashboardService();
