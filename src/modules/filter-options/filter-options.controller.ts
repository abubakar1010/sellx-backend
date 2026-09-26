import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { filterOptionsService } from './filter-options.service';

export const filterOptionsController = {
    getOptions: catchAsync(async (req, res) => {
        const category = req.query.category as string;
        const data = filterOptionsService.getOptions(category);
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Filter options fetched successfully',
            data,
        });
    }),

    getModels: catchAsync(async (req, res) => {
        const category = req.query.category as string;
        const brand = req.query.brand as string;
        const models = filterOptionsService.getModelsForBrand(category, brand);
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Models fetched successfully',
            data: models,
        });
    }),
};
