import { NotFoundError } from '@/core/errors';
import { SubscriptionModel } from './subscription.model';
import type { CreateSubscriptionBody, UpdateSubscriptionBody } from './subscription.validation';
import type { ISubscriptionDocument } from './subscription.interface';

export const subscriptionService = {
    async create(payload: CreateSubscriptionBody): Promise<ISubscriptionDocument> {
        return SubscriptionModel.create(payload) as any;
    },

    async update(id: string, payload: UpdateSubscriptionBody): Promise<ISubscriptionDocument> {
        const updated = await SubscriptionModel.findByIdAndUpdate(id, payload, { new: true });
        if (!updated) throw new NotFoundError('Subscription not found');
        return updated;
    },

    async delete(id: string): Promise<void> {
        const existing = await SubscriptionModel.findById(id);
        if (!existing) throw new NotFoundError('Subscription not found');
        await SubscriptionModel.deleteOne({ _id: id });
    },

    async toggleStatus(id: string): Promise<ISubscriptionDocument> {
        const doc = await SubscriptionModel.findById(id);
        if (!doc) throw new NotFoundError('Subscription not found');
        doc.isActive = !doc.isActive;
        await doc.save();
        return doc;
    },

    async getById(id: string): Promise<ISubscriptionDocument> {
        const doc = await SubscriptionModel.findById(id);
        if (!doc) throw new NotFoundError('Subscription not found');
        return doc;
    },

    async getAll(): Promise<ISubscriptionDocument[]> {
        return SubscriptionModel.find().sort({ price: 1 });
    },

    async getActive(): Promise<ISubscriptionDocument[]> {
        return SubscriptionModel.find({ isActive: true }).sort({ price: 1 });
    },
};
