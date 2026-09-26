import mongoose, { Schema } from 'mongoose';

import type { ICategoryDocument } from './category.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

/**
 * Utility to generate a URL-friendly slug from a title
 */
const generateSlug = (title: string): string =>
    title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except spaces/hyphens
        .replace(/[\s_-]+/g, '-') // collapse whitespace/underscores to single hyphen
        .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

const categorySchema = new Schema<ICategoryDocument>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            minlength: 2,
            maxlength: 100,
            unique: true,
        },
        slug: {
            type: String,
            required: [true, 'Slug is required'],
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
            immutable: true, // usually better to keep slugs stable for SEO
        },
        thumbnail: {
            type: String,
            required: [true, 'Thumbnail URL is required'],
            trim: true,
            validate: {
                validator: (v: string) => /^https?:\/\/.+\..+/.test(v) || v.startsWith('/uploads/'),
                message: 'Invalid thumbnail URL format',
            },
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        basicPricing: {
            type: Number,
            min: 0,
        },
        plusPricing: {
            type: Number,
            min: 0,
        },
        sortOrder: {
            type: Number,
            default: 0,
            min: 0,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

// Auto-generate slug on validate (so required/unique checks see it)
categorySchema.pre<ICategoryDocument>('validate', async function () {
    if (this.isNew && this.title && !this.slug) {
        this.slug = generateSlug(this.title as string);
    }
});

// Indexes (compound + text search)
categorySchema.index({ isActive: 1, sortOrder: -1 });
categorySchema.index({ title: 'text', description: 'text' });

// Plugins (ensure these are imported as callable functions)
categorySchema.plugin(toJSONPlugin);
categorySchema.plugin(paginatePlugin);

export const CategoryModel = mongoose.model<ICategoryDocument, PaginateModel<ICategoryDocument>>(
    'Category',
    categorySchema,
    'categories',
);
