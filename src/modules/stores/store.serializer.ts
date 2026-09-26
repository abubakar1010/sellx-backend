import type { IStoreDocument, IDailyStat } from './store.interface';
import type { SerializerFn } from '@/core/types/serializer.types';

export interface WeeklyPerformanceEntry {
    date: string;
    views: number;
    clicks: number;
}

export interface StoreResponseDto {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    banner?: string;
    description?: string;
    category: {
        id: string;
        title: string;
        slug: string;
    };
    contacts: Array<{
        type: string;
        value: string;
    }>;
    status: string;
    isActive: boolean;
    isVerified: boolean;
    totalProducts: number;
    avgRating: number;
    totalReviewCount: number;
    followerCount: number;
    totalViews: number;
    totalClicks: number;
    totalMessages: number;
    weeklyPerformance: WeeklyPerformanceEntry[];
    isFollowing?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface StoreBasicDto {
    id: string;
    name: string;
    logo?: string;
    category: {
        id: string;
        title: string;
        slug: string;
    };
    status: string;
    isActive: boolean;
    isVerified: boolean;
}

const resolveId = (store: IStoreDocument): string => store.id ?? String((store as any)._id ?? '');

const getWeeklyPerformance = (dailyStats: IDailyStat[]): WeeklyPerformanceEntry[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: WeeklyPerformanceEntry[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);

        const stat = dailyStats.find(
            (s) => new Date(s.date).toISOString().slice(0, 10) === dateStr,
        );

        days.push({
            date: dateStr,
            views: stat?.views ?? 0,
            clicks: stat?.clicks ?? 0,
        });
    }

    return days;
};

const resolveCategory = (store: IStoreDocument) => {
    if (store.category && typeof store.category === 'object' && 'title' in store.category) {
        return {
            id: resolveId(store.category as any),
            title: (store.category as any).title,
            slug: (store.category as any).slug,
        };
    }
    return {
        id: store.category?.toString() ?? '',
        title: '',
        slug: '',
    };
};

export interface SerializeStoreOptions {
    isFollowing?: boolean;
}

export const serializeStore = (
    store: IStoreDocument,
    options?: SerializeStoreOptions,
): StoreResponseDto => ({
    id: resolveId(store),
    name: store.name,
    slug: store.slug,
    logo: store.logo,
    banner: store.banner,
    description: store.description,
    category: resolveCategory(store),
    contacts: store.contacts ?? [],
    status: store.status ?? 'active',
    isActive: store.isActive,
    isVerified: store.isVerified,
    totalProducts: store.totalProducts ?? 0,
    avgRating: store.avgRating ?? 0,
    totalReviewCount: store.totalReviewCount ?? 0,
    followerCount: store.followerCount ?? 0,
    totalViews: store.totalViews ?? 0,
    totalClicks: store.totalClicks ?? 0,
    totalMessages: store.totalMessages ?? 0,
    weeklyPerformance: getWeeklyPerformance(store.dailyStats ?? []),
    isFollowing: options?.isFollowing,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
});

export const serializeStoreBasic: SerializerFn<IStoreDocument, StoreBasicDto> = (store) => ({
    id: resolveId(store),
    name: store.name,
    logo: store.logo,
    category: resolveCategory(store),
    status: store.status ?? 'active',
    isActive: store.isActive,
    isVerified: store.isVerified,
});

export const serializeStores = (stores: IStoreDocument[]) => stores.map((s) => serializeStore(s));
export const serializeStoresBasic = (stores: IStoreDocument[]) =>
    stores.map((s) => serializeStoreBasic(s));
