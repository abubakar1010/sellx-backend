import mongoose, { Schema } from 'mongoose';
import type { IStoryDocument, IStoryPackageDocument } from './story.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const storySchema = new Schema<IStoryDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            index: true,
        },
        media: {
            type: String,
            required: true,
        },
        texts: [
            {
                text: { type: String, required: true, maxlength: 500 },
                style: {
                    fontSize: { type: Number, min: 8, max: 200 },
                    color: { type: String, trim: true },
                    fontWeight: { type: String, enum: ['normal', 'bold'] },
                    fontFamily: { type: String, trim: true },
                    textAlign: { type: String, enum: ['left', 'center', 'right'] },
                    position: {
                        x: { type: Number, min: 0, max: 100 },
                        y: { type: Number, min: 0, max: 100 },
                    },
                },
                _id: false,
            },
        ],
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
        },
        purchase: {
            type: Schema.Types.ObjectId,
            ref: 'StoryPurchase',
            index: true,
        },
        expireIn: {
            type: Number,
            min: 1,
            default: 24,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        views: [
            {
                user: { type: Schema.Types.ObjectId, ref: 'User' },
                viewedAt: { type: Date, default: Date.now },
                _id: false,
            },
        ],
        viewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

storySchema.virtual('isActive').get(function () {
    return !this.isDeleted && this.expiresAt > new Date();
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ store: 1, createdAt: -1 });

storySchema.plugin(toJSONPlugin);
storySchema.plugin(paginatePlugin);

export const StoryModel = mongoose.model<IStoryDocument, PaginateModel<IStoryDocument>>(
    'Story',
    storySchema,
    'stories',
);

const storyPackageSchema = new Schema<IStoryPackageDocument>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, required: true, trim: true },
        durationHours: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        maxStories: { type: Number, required: true, min: 1, default: 1 },
        isActive: { type: Boolean, default: true, index: true },
        currency: { type: String, enum: [CURRENCY], default: CURRENCY, trim: true },
        validityDays: { type: Number, required: true, min: 1, default: 30 },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'story_packages',
    },
);

storyPackageSchema.plugin(toJSONPlugin);
storyPackageSchema.plugin(paginatePlugin);

export const StoryPackageModel = mongoose.model<
    IStoryPackageDocument,
    PaginateModel<IStoryPackageDocument>
>('StoryPackage', storyPackageSchema);
