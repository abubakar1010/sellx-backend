import mongoose, { Schema } from 'mongoose';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { ACTIVITY_TYPES, ACTOR_TYPES, type IActivityDocument } from './activity.interface';

const activitySchema = new Schema<IActivityDocument>(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        actorType: {
            type: String,
            enum: ACTOR_TYPES,
            required: true,
        },
        targetId: {
            type: String,
        },
        targetType: {
            type: String,
        },
        activityType: {
            type: String,
            enum: ACTIVITY_TYPES,
            required: true,
            index: true,
        },
        message: {
            type: String,
            required: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ activityType: 1, createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });

activitySchema.plugin(toJSONPlugin);
activitySchema.plugin(paginatePlugin);

export const ActivityModel = mongoose.model<IActivityDocument, PaginateModel<IActivityDocument>>(
    'Activity',
    activitySchema,
    'activities',
);
