import { ActivityModel } from './activity.model';
import type { CreateActivityInput, ActivityQuery } from './activity.interface';

interface ActivityRow {
    id: string;
    activity_type: string;
    message: string;
    actor: {
        id: string;
        name: string;
        avatar: string;
    } | null;
    target_id?: string;
    target_type?: string;
    metadata?: Record<string, unknown>;
    created_at: Date;
}

interface PaginatedActivities {
    items: ActivityRow[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

const ACTOR_POPULATE = 'firstName lastName avatarUrl';

function toActor(user: any): { id: string; name: string; avatar: string } | null {
    if (!user) return null;
    return {
        id: user._id?.toString() ?? user.id,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown',
        avatar: user.avatarUrl ?? '',
    };
}

function toRow(doc: any): ActivityRow {
    const d = doc.toObject ? doc.toObject() : doc;
    return {
        id: d._id?.toString() ?? d.id,
        activity_type: d.activityType,
        message: d.message,
        actor: d.actorId ? toActor(d.actorId) : null,
        target_id: d.targetId,
        target_type: d.targetType,
        metadata: d.metadata,
        created_at: d.createdAt,
    };
}

class ActivityRepository {
    async create(data: CreateActivityInput): Promise<void> {
        await ActivityModel.create([data]);
    }

    async findAll(query: ActivityQuery): Promise<PaginatedActivities> {
        const filter: Record<string, unknown> = {};
        if (query.type) filter.activityType = query.type;
        if (query.actorId) filter.actorId = query.actorId;

        const [total, docs] = await Promise.all([
            ActivityModel.countDocuments(filter),
            ActivityModel.find(filter)
                .populate('actorId', ACTOR_POPULATE)
                .sort({ createdAt: -1 })
                .skip((query.page - 1) * query.limit)
                .limit(query.limit)
                .lean(),
        ]);

        return {
            items: docs.map(toRow),
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                total_pages: Math.ceil(total / query.limit) || 1,
            },
        };
    }
}

export const activityRepository = new ActivityRepository();
