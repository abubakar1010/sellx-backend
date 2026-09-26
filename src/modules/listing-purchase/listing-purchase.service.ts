import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors';
import { ListingPackageModel } from '@/modules/listing-package/listing-package.model';
import { CategoryModel } from '@/modules/categories/category.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { listingPurchaseRepository } from './listing-purchase.repository';
import type { IListingPurchaseDocument } from './listing-purchase.interface';
import type { ListListingPurchasesQuery } from './listing-purchase.validation';
import { ListingPurchaseModel } from './listing-purchase.model';

export type ListingPurchaseResult =
    | { requiresPayment: false; purchase: IListingPurchaseDocument }
    | { requiresPayment: true; checkoutUrl: string };

export class ListingPurchaseService {
    async purchasePackage(
        userId: string,
        email: string,
        packageId: string,
        storeId?: string,
    ): Promise<ListingPurchaseResult> {
        const pkg = await ListingPackageModel.findById(packageId).lean();
        if (!pkg) throw new NotFoundError('Listing package not found');
        if (!pkg.isActive) throw new BadRequestError('This listing package is currently unavailable');

        const category = await CategoryModel.findById(pkg.category).lean();
        if (!category) throw new BadRequestError('The category for this package no longer exists');
        if (!category.isActive) throw new BadRequestError('The category for this package is currently inactive');

        // Paid package: create pending payment + Stripe Checkout Session
        if (pkg.price > 0) {
            const paymentTransaction = await PaymentTransactionModel.create({
                user: userId,
                ...(storeId ? { store: storeId } : {}),
                email,
                paymentType: 'listing',
                amount: pkg.price,
                currency: pkg.currency,
                status: 'pending',
                referenceModel: 'ListingPurchase',
                description: `Listing package: ${pkg.name} (${category.title})`,
                metadata: {
                    packageId,
                    categoryId: String(pkg.category),
                    durationHours: pkg.durationHours,
                    maxListings: pkg.maxListings,
                },
            });

            const session = await stripeService.createCheckoutSession({
                unitAmount: pkg.price,
                productName: `Listing Package: ${pkg.name} (${category.title})`,
                customerEmail: email,
                metadata: {
                    userId,
                    paymentType: 'listing',
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

        // Free package: auto-approve immediately (existing flow)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);

        const purchaseData: Record<string, unknown> = {
            user: userId,
            category: pkg.category,
            listingPackage: packageId,
            packageSnapshot: {
                name: pkg.name,
                category: String(pkg.category),
                categoryName: category.title,
                durationHours: pkg.durationHours,
                price: pkg.price,
                maxListings: pkg.maxListings,
                currency: pkg.currency,
                validityDays: pkg.validityDays,
            },
            listingsUsed: 0,
            status: 'active',
            purchasedAt: now,
            expiresAt,
        };

        if (storeId) purchaseData.store = storeId;

        const purchase = await listingPurchaseRepository.create(purchaseData as any);
        return { requiresPayment: false, purchase };
    }

    async listMyPurchases(
        userId: string,
        query: ListListingPurchasesQuery,
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

        if (query.category) filter.category = query.category;

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            ListingPurchaseModel.countDocuments(filter),
            ListingPurchaseModel.find(filter)
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

    async getActivePurchases(userId: string): Promise<IListingPurchaseDocument[]> {
        return listingPurchaseRepository.findActiveByUser(userId);
    }

    async getPurchaseById(
        purchaseId: string,
        userId: string,
    ): Promise<IListingPurchaseDocument> {
        const purchase = await listingPurchaseRepository.findById(purchaseId);
        if (!purchase) throw new NotFoundError('Listing purchase not found');
        if (String((purchase as any).user) !== userId) {
            throw new ForbiddenError('This purchase does not belong to you');
        }
        return purchase;
    }
}

export const listingPurchaseService = new ListingPurchaseService();
