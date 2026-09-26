import type { RequestHandler } from 'express';
import type { ZodError } from 'zod';

import { BadRequestError, NotFoundError } from '@/core/errors';
import { CategoryModel } from '@/modules/categories/category.model';
import { Product } from './products.model';
import { getProductSchema } from './schemas/registry';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const SLUG_TTL_MS = 5 * 60 * 1000;

/**
 * Category id -> slug, cached in-process. There are eleven categories and they
 * change rarely, so this keeps a database round trip off every listing write
 * without pulling Redis into the validation path.
 */
const slugCache = new Map<string, { slug: string; expiresAt: number }>();

/** Category slugs are immutable, so this exists for tests and for clearing a deleted category. */
export const clearCategorySlugCache = (): void => {
    slugCache.clear();
};

const readCategorySlug = async (categoryId: string): Promise<string | null> => {
    const cached = slugCache.get(categoryId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.slug;
    }

    const category = await CategoryModel.findById(categoryId).select('slug').lean();
    if (!category?.slug) {
        return null;
    }

    slugCache.set(categoryId, { slug: category.slug, expiresAt: Date.now() + SLUG_TTL_MS });
    return category.slug;
};

/**
 * Resolves the category a listing belongs to and attaches its slug to the request.
 *
 * On create the category comes from the body. On update it comes from the stored
 * listing, unless the body is moving the listing to a different category.
 */
export const resolveCategoryContext =
    (mode: 'create' | 'update'): RequestHandler =>
    (req, _res, next): void => {
        void (async () => {
            try {
                let categoryId = typeof req.body?.category === 'string' ? req.body.category : undefined;

                if (!categoryId && mode === 'update') {
                    const rawId = req.params.id;
                    const productId = Array.isArray(rawId) ? rawId[0] : rawId;
                    if (!productId || !OBJECT_ID.test(productId)) {
                        throw new BadRequestError('Invalid product ID', 'INVALID_PRODUCT_ID');
                    }

                    const existing = await Product.findById(productId).select('category').lean();
                    if (!existing) {
                        throw new NotFoundError('Product not found');
                    }
                    categoryId = String(existing.category);
                }

                if (!categoryId) {
                    throw new BadRequestError('Category is required', 'CATEGORY_REQUIRED');
                }

                if (!OBJECT_ID.test(categoryId)) {
                    throw new BadRequestError('Invalid category ID', 'INVALID_CATEGORY_ID');
                }

                const slug = await readCategorySlug(categoryId);
                if (!slug) {
                    throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
                }

                req.categorySlug = slug;
                next();
            } catch (error) {
                next(error);
            }
        })();
    };

const mapZodError = (error: ZodError): Record<string, unknown> => ({
    errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    })),
});

/**
 * Validates the body against the schema for the resolved category.
 *
 * Fields belonging to other categories are stripped rather than stored, so a
 * book listing cannot carry `horsepower`.
 */
export const validateByCategory: RequestHandler = (req, _res, next): void => {
    if (!req.categorySlug) {
        next(new BadRequestError('Category context was not resolved', 'CATEGORY_UNRESOLVED'));
        return;
    }

    const result = getProductSchema(req.categorySlug).safeParse(req.body);

    if (!result.success) {
        const details = mapZodError(result.error);
        const message = result.error.issues[0]?.message ?? 'Validation failed';
        next(new BadRequestError(message, 'VALIDATION_ERROR', details));
        return;
    }

    req.body = result.data as typeof req.body;
    next();
};
