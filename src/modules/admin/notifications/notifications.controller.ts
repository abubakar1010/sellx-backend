import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { NotificationModel } from '@/modules/notification/notification.model';
import { UserModel } from '@/modules/user/user.model';
import { listNotificationsQuerySchema, notificationIdParamSchema } from '@/modules/notification/notification.validation';

export const adminNotificationsController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = listNotificationsQuerySchema.parse(req.query);

        const filter: Record<string, unknown> = {};
        if (query.isRead !== undefined) filter.isRead = query.isRead;

        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            NotificationModel.countDocuments(filter),
            NotificationModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const userIds = [...new Set(docs.map((d: any) => d.userId).filter(Boolean))];
        const users = await UserModel.find({ _id: { $in: userIds } })
            .select('firstName lastName email avatarUrl')
            .lean();
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

        const items = docs.map((d: any) => {
            const id = d._id?.toString() ?? d.id;
            const uid = d.userId ?? '';
            const user = userMap.get(uid);
            return {
                id,
                userId: uid,
                user: user
                    ? {
                          id: user._id?.toString() ?? (user as any).id,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          avatarUrl: user.avatarUrl,
                      }
                    : null,
                title: d.title ?? '',
                message: d.message ?? '',
                type: d.type ?? 'info',
                isRead: d.isRead ?? false,
                readAt: d.readAt,
                metadata: d.metadata,
                createdAt: d.createdAt,
            };
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Notifications fetched successfully.',
            data: {
                items,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
            },
        });
    }),

    markAsRead: catchAsync(async (req: Request, res: Response) => {
        const { id } = notificationIdParamSchema.parse(req.params);

        const updated = await NotificationModel.findByIdAndUpdate(
            id,
            { isRead: true, readAt: new Date() },
            { new: true },
        ).lean();

        if (!updated) {
            return sendResponse(res, {
                statusCode: HTTP_STATUS.NOT_FOUND,
                message: 'Notification not found.',
                data: null,
            });
        }

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Notification marked as read.',
            data: {
                id: updated._id?.toString() ?? (updated as any).id,
                isRead: true,
                readAt: updated.readAt,
            },
        });
    }),
};
