import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors';
import { StoryPackageModel } from '@/modules/stories/story.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { storyPurchaseRepository } from './story-purchase.repository';
import type { IStoryPurchaseDocument } from './story-purchase.interface';
import type { ListStoryPurchasesQuery } from './story-purchase.validation';
import { StoryPurchaseModel } from './story-purchase.model';

export type StoryPurchaseResult =
    | { requiresPayment: false; purchase: IStoryPurchaseDocument }
    | { requiresPayment: true; checkoutUrl: string };

export class StoryPurchaseService {
    async purchasePackage(
        userId: string,
        email: string,
        packageId: string,
        storeId?: string,
    ): Promise<StoryPurchaseResult> {
        const pkg = await StoryPackageModel.findById(packageId).lean();
        if (!pkg) throw new NotFoundError('Story package not found');
        if (!pkg.isActive) throw new BadRequestError('This story package is currently unavailable');

        // Paid package: create pending payment + Stripe Checkout Session
        if (pkg.price > 0) {
            const paymentTransaction = await PaymentTransactionModel.create({
                user: userId,
                ...(storeId ? { store: storeId } : {}),
                email,
                paymentType: 'story',
                amount: pkg.price,
                currency: pkg.currency,
                status: 'pending',
                referenceModel: 'StoryPurchase',
                description: `Story package: ${pkg.name}`,
                metadata: {
                    packageId,
                    durationHours: pkg.durationHours,
                    maxStories: pkg.maxStories,
                },
            });

            const session = await stripeService.createCheckoutSession({
                unitAmount: pkg.price,
                productName: `Story Package: ${pkg.name}`,
                customerEmail: email,
                metadata: {
                    userId,
                    paymentType: 'story',
                    packageId,
                    storeId: storeId ?? '',
                    paymentTransactionId: paymentTransaction._id.toString(),
                },
            });

            await PaymentTransactionModel.updateOne(
                { _id: paymentTransaction._id },
                { stripeSessionId: session.sessionId },
            );

            return { requiresPayment: true, checkoutUrl: session.url };
        }

        // Free package: auto-approve immediately
        const now = new Date();
        const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);

        const purchaseData: Record<string, unknown> = {
            user: userId,
            storyPackage: packageId,
            packageSnapshot: {
                name: pkg.name,
                description: pkg.description,
                durationHours: pkg.durationHours,
                price: pkg.price,
                maxStories: pkg.maxStories,
                currency: pkg.currency,
                validityDays: pkg.validityDays,
            },
            storiesUsed: 0,
            status: 'active',
            purchasedAt: now,
            expiresAt,
        };

        if (storeId) purchaseData.store = storeId;

        const purchase = await storyPurchaseRepository.create(purchaseData as any);
        return { requiresPayment: false, purchase };
    }

    async listMyPurchases(
        userId: string,
        query: ListStoryPurchasesQuery,
    ) {
        const filter: Record<string, unknown> = { user: userId };

        if (query.status) {
            if (query.status === 'active') {
                filter.status = 'active';
                filter.expiresAt = { $gt: new Date() };
            } else {
                filter.status = query.status;
            }
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            StoryPurchaseModel.countDocuments(filter),
            StoryPurchaseModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            items: docs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getActivePurchases(userId: string): Promise<IStoryPurchaseDocument[]> {
        return storyPurchaseRepository.findActiveByUser(userId);
    }

    async getPurchaseById(
        purchaseId: string,
        userId: string,
    ): Promise<IStoryPurchaseDocument> {
        const purchase = await storyPurchaseRepository.findById(purchaseId);
        if (!purchase) throw new NotFoundError('Story purchase not found');
        if (String((purchase as any).user) !== userId) {
            throw new ForbiddenError('This purchase does not belong to you');
        }
        return purchase;
    }
}

export const storyPurchaseService = new StoryPurchaseService();
