/**
 * `product.middleware.ts` — the code between a Zod failure and the 400 the client renders.
 *
 * Nothing referenced this file before the audit, yet every validation error the app has ever
 * shown a user was shaped here, and the body-replacement step is what stops a book listing from
 * carrying `horsepower` into the database.
 *
 * Mongoose is mocked at the model boundary, so there is no database and no Redis.
 */
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@/core/errors';
import { CategoryModel } from '@/modules/categories/category.model';
import {
    clearCategorySlugCache,
    resolveCategoryContext,
    validateByCategory,
} from '@/modules/products/product.middleware';
import { Product } from '@/modules/products/products.model';
import { validListing } from '@tests/factories/product.factory';

const CATEGORY_ID = '507f1f77bcf86cd799439011';
const PRODUCT_ID = '507f191e810c19729de860ea';

/**
 * `resolveCategoryContext` returns synchronously and does its work inside a `void (async …)()`,
 * so `next` has not been called yet when the handler returns. Every assertion on `next` has to
 * wait a macrotask first — without this, a test passes by asserting nothing.
 */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** jest.config sets resetMocks, so every mock has to be built inside the `it()` that uses it. */
const mockCategory = (slug: string | null) =>
    jest.spyOn(CategoryModel, 'findById').mockReturnValue({
        select: () => ({ lean: async () => (slug ? { slug } : null) }),
    } as never);

const mockProduct = (category: string | null) =>
    jest.spyOn(Product, 'findById').mockReturnValue({
        select: () => ({ lean: async () => (category ? { category } : null) }),
    } as never);

interface Call {
    req: Request;
    next: jest.Mock;
}

const call = (body: unknown = {}, params: Record<string, string> = {}): Call => ({
    req: { body, params } as unknown as Request,
    next: jest.fn(),
});

const errorFrom = (next: jest.Mock): AppError => {
    const [error] = next.mock.calls[0] ?? [];
    if (!(error instanceof AppError)) throw new Error(`next() was not called with an AppError`);
    return error;
};

beforeEach(() => {
    clearCategorySlugCache();
});

describe('resolveCategoryContext on create', () => {
    it('attaches the slug and continues', async () => {
        mockCategory('car');
        const { req, next } = call({ category: CATEGORY_ID });

        resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(req.categorySlug).toBe('car');
        expect(next).toHaveBeenCalledWith();
    });

    it('rejects a create with no category', async () => {
        const { req, next } = call({});

        resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(errorFrom(next)).toMatchObject({
            statusCode: 400,
            errorCode: 'CATEGORY_REQUIRED',
            message: 'Category is required',
        });
    });

    it.each([[42], [['a']], [{ id: 1 }], [null]])(
        'treats the non-string category %p as missing',
        async (category) => {
            const { req, next } = call({ category });

            resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
            await flush();

            expect(errorFrom(next).errorCode).toBe('CATEGORY_REQUIRED');
        },
    );

    it.each([['abc'], ['507f1f77bcf86cd79943901'], ['507f1f77bcf86cd7994390111']])(
        'rejects the malformed category id %p',
        async (category) => {
            const { req, next } = call({ category });

            resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
            await flush();

            expect(errorFrom(next)).toMatchObject({
                statusCode: 400,
                errorCode: 'INVALID_CATEGORY_ID',
            });
        },
    );

    it('404s when no category has that id', async () => {
        mockCategory(null);
        const { req, next } = call({ category: CATEGORY_ID });

        resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(errorFrom(next)).toMatchObject({
            statusCode: 404,
            errorCode: 'CATEGORY_NOT_FOUND',
        });
    });

    it('never reads the route params on create', async () => {
        mockCategory('sellx');
        const findById = mockProduct(CATEGORY_ID);
        const { req, next } = call({ category: CATEGORY_ID }, { id: PRODUCT_ID });

        resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(findById).not.toHaveBeenCalled();
    });
});

describe('resolveCategoryContext on update', () => {
    it('takes the category from the stored listing', async () => {
        mockProduct(CATEGORY_ID);
        mockCategory('boat');
        const { req, next } = call({ title: 'Renamed' }, { id: PRODUCT_ID });

        resolveCategoryContext('update')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(req.categorySlug).toBe('boat');
        expect(next).toHaveBeenCalledWith();
    });

    it('lets the body override the stored category without loading the listing', async () => {
        const findById = mockProduct(CATEGORY_ID);
        mockCategory('property');
        const { req, next } = call({ category: CATEGORY_ID }, { id: PRODUCT_ID });

        resolveCategoryContext('update')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(req.categorySlug).toBe('property');
        expect(findById).not.toHaveBeenCalled();
    });

    it.each([[undefined], [''], ['not-an-id']])(
        'rejects the product id %p',
        async (id) => {
            const { req, next } = call({}, id === undefined ? {} : { id });

            resolveCategoryContext('update')(req, {} as Response, next as unknown as NextFunction);
            await flush();

            expect(errorFrom(next)).toMatchObject({
                statusCode: 400,
                errorCode: 'INVALID_PRODUCT_ID',
            });
        },
    );

    it('404s when the listing is gone', async () => {
        mockProduct(null);
        const { req, next } = call({}, { id: PRODUCT_ID });

        resolveCategoryContext('update')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(errorFrom(next).statusCode).toBe(404);
        expect(errorFrom(next).message).toBe('Product not found');
    });

    it('forwards a repository failure rather than swallowing it', async () => {
        jest.spyOn(Product, 'findById').mockReturnValue({
            select: () => ({
                lean: async () => {
                    throw new Error('connection lost');
                },
            }),
        } as never);
        const { req, next } = call({}, { id: PRODUCT_ID });

        resolveCategoryContext('update')(req, {} as Response, next as unknown as NextFunction);
        await flush();

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'connection lost' }));
    });
});

describe('the category slug cache', () => {
    it('queries once for repeated writes in the same category', async () => {
        const findById = mockCategory('car');

        for (let i = 0; i < 3; i += 1) {
            const { req, next } = call({ category: CATEGORY_ID });
            resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
            await flush();
        }

        expect(findById).toHaveBeenCalledTimes(1);
    });

    it('queries again for a different category', async () => {
        const findById = mockCategory('car');
        const other = '507f1f77bcf86cd799439012';

        for (const category of [CATEGORY_ID, other]) {
            const { req, next } = call({ category });
            resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
            await flush();
        }

        expect(findById).toHaveBeenCalledTimes(2);
    });

    it('does not cache a miss, so a category added later is picked up', async () => {
        const findById = mockCategory(null);

        for (let i = 0; i < 2; i += 1) {
            const { req, next } = call({ category: CATEGORY_ID });
            resolveCategoryContext('create')(req, {} as Response, next as unknown as NextFunction);
            await flush();
        }

        expect(findById).toHaveBeenCalledTimes(2);
    });

    it('re-queries once the five-minute entry has expired', async () => {
        const findById = mockCategory('car');
        const now = Date.now();
        const clock = jest.spyOn(Date, 'now');

        clock.mockReturnValue(now);
        const first = call({ category: CATEGORY_ID });
        resolveCategoryContext('create')(first.req, {} as Response, first.next as unknown as NextFunction);
        await flush();

        clock.mockReturnValue(now + 5 * 60 * 1000 + 1);
        const second = call({ category: CATEGORY_ID });
        resolveCategoryContext('create')(second.req, {} as Response, second.next as unknown as NextFunction);
        await flush();

        expect(findById).toHaveBeenCalledTimes(2);
        clock.mockRestore();
    });

    it('is emptied by clearCategorySlugCache', async () => {
        const findById = mockCategory('car');

        const first = call({ category: CATEGORY_ID });
        resolveCategoryContext('create')(first.req, {} as Response, first.next as unknown as NextFunction);
        await flush();

        clearCategorySlugCache();

        const second = call({ category: CATEGORY_ID });
        resolveCategoryContext('create')(second.req, {} as Response, second.next as unknown as NextFunction);
        await flush();

        expect(findById).toHaveBeenCalledTimes(2);
    });
});

describe('validateByCategory', () => {
    const run = (slug: string | undefined, body: unknown): Call => {
        const c = call(body);
        (c.req as Request).categorySlug = slug;
        validateByCategory(c.req, {} as Response, c.next as unknown as NextFunction);
        return c;
    };

    it('refuses to run before the category has been resolved', () => {
        const { next } = run(undefined, {});

        expect(errorFrom(next)).toMatchObject({
            statusCode: 400,
            errorCode: 'CATEGORY_UNRESOLVED',
        });
    });

    it('replaces the body with the parsed data, defaults included', () => {
        const { req, next } = run('sellx', validListing('sellx'));

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toMatchObject({ currency: 'NOK', contacts: [], transactionType: 'for_sell' });
    });

    // The whole point of the replacement: what the service writes is what the schema returned,
    // not what the client sent.
    it('strips foreign fields from req.body, not merely from its own result', () => {
        const { req } = run('book', validListing('book', { horsepower: 500, isAdmin: true }));

        expect(req.body).not.toHaveProperty('horsepower');
        expect(req.body).not.toHaveProperty('isAdmin');
        expect(req.body).toHaveProperty('bookCategory');
    });

    it('turns a schema failure into a 400 VALIDATION_ERROR', () => {
        const { next } = run('sellx', validListing('sellx', { title: undefined }));

        expect(errorFrom(next)).toMatchObject({
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
        });
    });

    it('uses the first issue as the top-level message', () => {
        const { next } = run('sellx', validListing('sellx', { currency: 'USD' }));
        const error = errorFrom(next);
        const errors = (error.details as { errors: { message: string }[] }).errors;

        expect(error.message).toBe(errors[0]!.message);
    });

    it('lists every failed field as { field, message }', () => {
        const { next } = run(
            'sellx',
            validListing('sellx', { title: undefined, description: undefined }),
        );
        const { errors } = errorFrom(next).details as {
            errors: { field: string; message: string }[];
        };

        expect(errors.map((e) => e.field).sort()).toEqual(['description', 'title']);
        expect(errors.every((e) => typeof e.message === 'string' && e.message.length > 0)).toBe(true);
    });

    it('reports nested failures with a dotted path the client can map to an input', () => {
        const { next } = run(
            'property',
            validListing('property:for_rent', {
                location: { address: 'A road', latitude: '', longitude: 10.7 },
                viewings: [{ date: '2026-09-14', fromTime: '25:00' }],
            }),
        );
        const { errors } = errorFrom(next).details as { errors: { field: string }[] };

        expect(errors.map((e) => e.field)).toEqual(
            expect.arrayContaining(['location.latitude', 'viewings.0.fromTime']),
        );
    });

    it('validates an unknown slug against the SellX schema', () => {
        const { req, next } = run('a-category-an-admin-added', validListing('sellx'));

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toMatchObject({ currency: 'NOK' });
    });

    // Reported, not fixed: `invalid_union` carries no message of its own, so the top-level text a
    // client shows for a car with no vehicleType is the bare "Invalid input". The field path is
    // right, which is what this locks down.
    it('names the discriminator when it is missing, though the message is Zod\'s generic one', () => {
        const { next } = run('car', validListing('car:personbil', { vehicleType: undefined }));
        const { errors } = errorFrom(next).details as { errors: { field: string }[] };

        expect(errors.map((e) => e.field)).toContain('vehicleType');
    });

    it('reports an empty field path for a body that is not an object', () => {
        const { next } = run('sellx', 'not an object');
        const { errors } = errorFrom(next).details as { errors: { field: string }[] };

        expect(errors[0]!.field).toBe('');
    });
});
