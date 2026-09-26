import { BadRequestError, UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { storyService } from './story.service';
import { serializeStory, serializeStories, serializeStoryGroups } from './story.serializer';
import { createStoryBodySchema, updateStoryBodySchema, listStoriesQuerySchema } from './story.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

const getParamId = (id: unknown): string => {
    if (typeof id !== 'string') throw new BadRequestError('Invalid ID');
    return id;
};

export const storyController = {
    create: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const files = req.files as Express.Multer.File[];

        if (!files?.length) {
            throw new BadRequestError('At least one image is required');
        }

        const parsed = createStoryBodySchema.parse(req.body);
        const storeId = (req as any).activeStoreId;

        const stories = await storyService.createStory(parsed, files, userId, storeId);

        addActivityJob({
            activityType: 'story_created',
            actorId: userId,
            actorType: 'user',
            targetId: stories[0]?._id?.toString() ?? stories[0]?.id,
            targetType: 'story',
            message: `${req.user?.firstName ?? 'A user'} created a new story.`,
            metadata: { mediaCount: files.length },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Stories created successfully',
            data: serializeStories(stories, userId),
        });
    }),

    list: catchAsync(async (req, res) => {
        const query = listStoriesQuerySchema.parse(req.query);
        const result = await storyService.listStories(query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Stories fetched successfully',
            data: {
                groups: serializeStoryGroups(result.groups, req.user?.id),
                meta: result.meta,
            },
        });
    }),

    getById: catchAsync(async (req, res) => {
        const id = getParamId(req.params.id);
        const story = await storyService.getStory(id, req.user?.id);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story fetched successfully',
            data: serializeStory(story, {
                isViewed: req.user?.id
                    ? (story.views ?? []).some((v: any) => String(v.user) === req.user!.id)
                    : false,
            }),
        });
    }),

    update: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const id = getParamId(req.params.id);
        const parsed = updateStoryBodySchema.parse(req.body);
        const story = await storyService.updateStory(id, userId, parsed);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story updated successfully',
            data: serializeStory(story, {
                isViewed: req.user?.id
                    ? (story.views ?? []).some((v: any) => String(v.user) === req.user!.id)
                    : false,
            }),
        });
    }),

    delete: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const id = getParamId(req.params.id);

        await storyService.deleteStory(id, userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story deleted successfully',
            data: null,
        });
    }),
};
