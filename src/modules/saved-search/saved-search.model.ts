import mongoose, { Schema } from 'mongoose';
import { paginatePlugin, type PaginateModel } from '@/infrastructure/database/plugins/paginate.plugin';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import type { ISavedSearchDocument } from './saved-search.interface';

const savedSearchSchema = new Schema<ISavedSearchDocument>(
    {
        user: {
            type: String,
            required: true,
            index: true,
        },
        text: {
            type: String,
            trim: true,
            maxlength: 200,
        },
        category: {
            type: String,
            trim: true,
            index: true,
        },
        filters: {
            type: Schema.Types.Mixed,
        },
        sort: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'savedsearches',
    },
);

savedSearchSchema.index({ user: 1, text: 1, category: 1 }, { unique: true, sparse: true });
savedSearchSchema.index({ user: 1, createdAt: -1 });

savedSearchSchema.plugin(toJSONPlugin);
savedSearchSchema.plugin(paginatePlugin);

export const SavedSearchModel = mongoose.model<ISavedSearchDocument, PaginateModel<ISavedSearchDocument>>(
    'SavedSearch',
    savedSearchSchema,
    'savedsearches',
);
