import type { Document, Types } from 'mongoose';

export const ACTIVITY_TYPES = [
    'user_registered',
    'store_created',
    'store_approved',
    'store_rejected',
    'listing_created',
    'listing_approved',
    'listing_rejected',
    'listing_flagged',
    'story_created',
    'subscription_renewed',
    'subscription_cancelled',
    'payment_received',
    'admin_action',
    'system_event',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTOR_TYPES = ['user', 'admin', 'system'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export interface IActivity {
    actorId?: Types.ObjectId;
    actorType: ActorType;
    targetId?: string;
    targetType?: string;
    activityType: ActivityType;
    message: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IActivityDocument extends IActivity, Document {
    id: string;
}

export interface CreateActivityInput {
    actorId?: string;
    actorType: ActorType;
    targetId?: string;
    targetType?: string;
    activityType: ActivityType;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface ActivityQuery {
    page: number;
    limit: number;
    type?: ActivityType;
    actorId?: string;
}
