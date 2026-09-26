import { UnauthorizedError, BadRequestError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { savedSearchService } from './saved-search.service';
import { serializeSavedSearch, serializeSavedSearches } from './saved-search.serializer';
import { createSavedSearchBodySchema, updateSavedSearchBodySchema, listSavedSearchesQuerySchema } from './saved-search.validation';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const savedSearchController = {
    create: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const data = createSavedSearchBodySchema.parse(req.body);
        const saved = await savedSearchService.create(userId, data, { signal: req.signal });
        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Search saved successfully',
            data: serializeSavedSearch(saved),
        });
    }),
    update: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (!id) throw new BadRequestError('Invalid ID');
        const data = updateSavedSearchBodySchema.parse(req.body);
        const saved = await savedSearchService.update(id, userId, data, { signal: req.signal });
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Search updated successfully',
            data: serializeSavedSearch(saved),
        });
    }),

    list: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = listSavedSearchesQuerySchema.parse(req.query);
        const result = await savedSearchService.list(userId, {
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            sort: '-createdAt',
        }, query.category);
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Saved searches fetched successfully',
            data: serializeSavedSearches(result.data),
            meta: result.meta as unknown as Record<string, unknown>,
        });
    }),

    delete: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const id = typeof req.params.id === 'string' ? req.params.id : '';
        if (!id) throw new BadRequestError('Invalid ID');
        await savedSearchService.delete(id, userId, { signal: req.signal });
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Saved search deleted successfully',
            data: null,
        });
    }),
};
