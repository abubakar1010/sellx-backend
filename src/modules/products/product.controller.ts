import { BadRequestError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { productService } from './product.service';
import { BoostPlanModel } from './products.model';
import { TransactionType } from './product.enum';
import {
    listProductsQuerySchema,
    myProductsQuerySchema,
    promoteProductBodySchema,
    markSoldBodySchema,
    reportProductBodySchema,
} from './product.validation';
import { serializeProduct, serializeProducts } from './product.serializer';

/** `productUpload` uses named fields, so `req.files` arrives keyed by field name. */
const getUploadedFiles = (req: { files?: unknown }, field: 'images' | 'documents'): Express.Multer.File[] => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    return files?.[field] ?? [];
};

/**
 * Every listing form requires at least one image except the property "wanted to
 * rent" ad, where the spec makes uploading optional — the tenant is describing
 * themselves and what they are looking for, not showing a property.
 */
const imagesAreOptional = (categorySlug: string, transactionType: unknown): boolean =>
    categorySlug === 'property' && transactionType === TransactionType.WANTS_TO_RENT;

const getParamId = (params: Record<string, string | string[] | undefined>): string => {
    const id = params.id;
    if (Array.isArray(id)) return id[0] ?? '';
    return id ?? '';
};

export const productController = {
    listBoostPlans: catchAsync(async (req, res) => {
        const plans = await BoostPlanModel.find({ isActive: true }).sort('price').lean();
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Boost plans fetched successfully',
            data: plans,
        });
    }),

    listFavorites: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const result = await productService.listFavorites(req.user.id, page, limit);
        const reportedIds = await productService.enrichProductsWithViewerState(result.data as any, req.user.id).then(r => r.reportedIds);
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Favorite products fetched successfully',
            data: { rows: serializeProducts(result.data as any, { isFavorite: true, reportedIds, viewerId: req.user.id }), meta: result.meta },
        });
    }),

    listPublic: catchAsync(async (req, res) => {
        const query = listProductsQuerySchema.parse(req.query);
        const viewerId = req.user?.id;

        if (query.filter === 'recently_viewed') {
            if (!viewerId) {
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Recently viewed products fetched successfully',
                    data: { rows: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } },
                });
            }
            const result = await productService.getRecentlyViewed(viewerId, { page: query.page, limit: query.limit });
            const enriched = viewerId ? await productService.enrichProductsWithViewerState(result.data as any, viewerId) : { favoriteIds: new Set<string>(), reportedIds: new Set<string>() };
            return sendResponse(res, {
                statusCode: HTTP_STATUS.OK,
                message: 'Recently viewed products fetched successfully',
                data: { rows: serializeProducts(result.data as any, { ...enriched, viewerId }), meta: result.meta },
            });
        }

        const result = await productService.listProducts(query, viewerId);
        const enriched = viewerId ? await productService.enrichProductsWithViewerState(result.data as any, viewerId) : undefined;
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Products fetched successfully',
            data: { rows: serializeProducts(result.data as any, { ...enriched, viewerId }), meta: result.meta },
        });
    }),

    getPublicDetails: catchAsync(async (req, res) => {
        const id = getParamId(req.params);
        const viewerId = req.user?.id;
        const { product, isFavorite, isReported } = await productService.getProductDetails(id, viewerId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product fetched successfully',
            data: serializeProduct(product as any, { isFavorite, isReported, viewerId }),
        });
    }),

    listByStore: catchAsync(async (req, res) => {
        const storeId = req.params.storeId as string;
        const query = listProductsQuerySchema.parse(req.query);
        const viewerId = req.user?.id;
        const result = await productService.listProductsByStore(storeId, query, viewerId, {
            signal: req.signal,
        });

        const enriched = viewerId ? await productService.enrichProductsWithViewerState(result.data as any, viewerId) : undefined;
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Products fetched successfully',
            data: { rows: serializeProducts(result.data as any, { ...enriched, viewerId }), meta: result.meta },
        });
    }),

    createMyProduct: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');

        const images = getUploadedFiles(req, 'images');
        const documents = getUploadedFiles(req, 'documents');
        const body = req.body as Record<string, unknown>;

        if (!images.length && !imagesAreOptional(req.categorySlug!, body.transactionType)) {
            throw new BadRequestError('At least one image is required');
        }

        const uploadedMedia = await productService.processImages(images);
        const uploadedDocuments = documents.length
            ? await productService.processDocuments(documents)
            : undefined;

        const created = await productService.createProduct(
            body,
            uploadedMedia,
            req.user.id,
            req.categorySlug!,
            body.storeId as string | undefined,
            uploadedDocuments,
            { signal: req.signal },
        );

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Product created successfully',
            data: serializeProduct(created as any, { viewerId: req.user.id }),
        });
    }),

    updateMyProduct: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');

        const id = getParamId(req.params);
        const images = getUploadedFiles(req, 'images');
        const documents = getUploadedFiles(req, 'documents');
        const body = req.body as Record<string, unknown>;

        const uploadedMedia = images.length ? await productService.processImages(images) : undefined;
        const uploadedDocuments = documents.length
            ? await productService.processDocuments(documents)
            : undefined;

        const updated = await productService.updateMyProduct(
            id,
            req.user.id,
            body,
            req.categorySlug!,
            body.storeId as string | undefined,
            uploadedMedia,
            uploadedDocuments,
            { signal: req.signal },
        );

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product updated successfully',
            data: serializeProduct(updated as any, { viewerId: req.user.id }),
        });
    }),

    deleteMyProduct: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');

        const id = getParamId(req.params);
        await productService.softDeleteMyProduct(id, req.user.id, { signal: req.signal });

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product deleted successfully',
            data: null,
        });
    }),

    listMyProducts: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');
        const query = myProductsQuerySchema.parse(req.query);
        const result = await productService.listMyProducts(req.user.id, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'My products fetched successfully',
            data: { rows: serializeProducts(result.data as any, { viewerId: req.user.id }), meta: result.meta },
        });
    }),

    markAsSold: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');
        const id = getParamId(req.params);
        const body = markSoldBodySchema.parse(req.body);
        const updated = await productService.markAsSold(id, req.user.id, body.quantity);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product marked as sold',
            data: serializeProduct(updated as any, { viewerId: req.user.id }),
        });
    }),

    approve: catchAsync(async (req, res) => {
        const id = getParamId(req.params);
        const updated = await productService.approveProduct(id);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product approved successfully',
            // Moderation: the seller's details are needed whatever their privacy flags say.
            data: serializeProduct(updated as any, { revealSeller: true }),
        });
    }),

    promote: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');
        const id = getParamId(req.params);
        const { planId } = promoteProductBodySchema.parse(req.body);
        const updated = await productService.promoteProduct(id, req.user.id, planId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product promoted successfully',
            data: serializeProduct(updated as any, { viewerId: req.user.id }),
        });
    }),

    toggleFavorite: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');

        const id = getParamId(req.params);
        const result = await productService.toggleFavorite(id, req.user.id, { signal: req.signal });

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Favorite updated',
            data: result,
        });
    }),

    report: catchAsync(async (req, res) => {
        if (!req.user?.id) throw new BadRequestError('Unauthorized');

        const id = getParamId(req.params);
        const body = reportProductBodySchema.parse(req.body);
        await productService.reportProduct(id, req.user.id, body, { signal: req.signal });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Report submitted',
            data: null,
        });
    }),

    getListingDetail: catchAsync(async (req, res) => {
        const id = getParamId(req.params);
        const viewerId = req.user?.id;
        const { product, seller, isFavorite, isReported } = await productService.getListingDetail(id, viewerId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing fetched successfully.',
            data: serializeProduct(product as any, { isFavorite, isReported, viewerId }),
        });
    }),
};