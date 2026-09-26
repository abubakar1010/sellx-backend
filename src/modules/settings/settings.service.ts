import { NotFoundError } from '@/core/errors';
import { SettingModel } from './settings.model';
import type { UpsertSettingBody } from './settings.validation';
import type { ISettingDocument } from './settings.interface';

export const settingService = {
    async list(slug?: string): Promise<ISettingDocument[]> {
        const filter: any = slug ? { slug } : {};
        return SettingModel.find(filter).sort({ slug: 1 }).lean() as any;
    },

    async upsert(payload: UpsertSettingBody): Promise<ISettingDocument> {
        const updated = await SettingModel.findOneAndUpdate(
            { slug: payload.slug },
            { $set: { title: payload.title, content: payload.content } },
            { upsert: true, new: true },
        ).lean();
        return updated as any;
    },

    async getById(id: string): Promise<ISettingDocument> {
        const doc = await SettingModel.findById(id).lean();
        if (!doc) throw new NotFoundError('Setting not found');
        return doc as any;
    },

    async getBySlug(slug: string): Promise<ISettingDocument> {
        const doc = await SettingModel.findOne({ slug } as any).lean();
        if (!doc) throw new NotFoundError('Setting not found');
        return doc as any;
    },
};
