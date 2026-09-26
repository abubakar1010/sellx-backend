import fs from 'node:fs';
import path from 'node:path';
import { ForbiddenError, NotFoundError, ConflictError, BadRequestError } from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type { OffsetPaginationResult } from '@/core/types/pagination.types';
import { UserModel } from '@/modules/user/user.model';
import { productRepository } from './product.repository';
import { storeRepository } from '../stores/store.repository';
import { getFileUrl, getFilePath } from '@/infrastructure/storage/local-storage';
import { notificationService } from '../notification/notification.service';
import { StoreFollowModel } from '../stores/store-follow.model';
import { sendPushNotification } from '@/infrastructure/push-notification';
import { deepLinkService } from '@shared/utils/deep-link.service';
import { storeTrackingProducer } from '@/jobs/producers/store-tracking.producer';
import { enqueueInBackground } from '@/jobs/producers/background';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import type {
    ListProductsQuery,
    MyProductsQuery,
    RecentlyViewedQuery,
    ReportProductBody,
} from './product.validation';
import type { IDocument, IMedia, IProduct, IProductWritePayload } from './product.interface';
import { Product, BoostPlanModel } from './products.model';
import { ProductStatus, TransactionType } from './product.enum';
import { listingPurchaseRepository } from '@/modules/listing-purchase/listing-purchase.repository';
import { ListingPurchaseModel } from '@/modules/listing-purchase/listing-purchase.model';
import { userSubscriptionRepository } from '@/modules/user-subscription/user-subscription.repository';
import { UserSubscriptionModel } from '@/modules/user-subscription/user-subscription.model';
import { escapeRegex } from '@shared/utils/escapeRegex';

/**
 * Colours are free text on the listing form ("Sort", "Obsidian Black metallic"),
 * so an exact match almost never lands. Each comma-separated term is matched
 * case-insensitively as a substring instead, the way `brand` and `city` are.
 */
export const colorMatcher = (value?: string): { $in: RegExp[] } | undefined => {
    const terms = (value ?? '')
        .split(',')
        .map((term) => term.trim())
        .filter(Boolean);

    if (!terms.length) return undefined;

    return { $in: terms.map((term) => new RegExp(escapeRegex(term), 'i')) };
};

export class ProductService {
    async getRecentlyViewed(
        userId: string,
        query: RecentlyViewedQuery,
    ): Promise<OffsetPaginationResult<IProduct>> {
        return productRepository.findRecentlyViewed(userId, query.page, query.limit);
    }

    async listFavorites(
        userId: string,
        page: number,
        limit: number,
    ): Promise<OffsetPaginationResult<IProduct>> {
        return productRepository.findFavorites(userId, page, limit);
    }

    async processImages(files: Express.Multer.File[]): Promise<IMedia[]> {
        return files.map((file) => ({
            url: getFileUrl(file.filename, 'products'),
            publicId: file.filename,
            type: 'image' as const,
        }));
    }

    async processDocuments(files: Express.Multer.File[]): Promise<IDocument[]> {
        return files.map((file) => ({
            url: getFileUrl(file.filename, 'products'),
            publicId: file.filename,
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        }));
    }

    /**
     * Fields the client must not be able to set directly.
     *
     * Job listings carry no price and giveaways are free; `totalPrice` is the
     * spec's auto-calculated total; and `showingDate` mirrors the first viewing
     * slot so the existing showing-date filter keeps working now that the form
     * collects several slots.
     */
    applyDerivedFields(payload: IProductWritePayload, categorySlug: string): void {
        if (categorySlug === 'job' || payload.transactionType === TransactionType.GIVE_AWAY) {
            payload.price = 0;
        }

        const price = Number(payload.price ?? 0);

        if (categorySlug === 'property') {
            payload.totalPrice =
                price + Number(payload.sharedDebt ?? 0) + Number(payload.additionalCosts ?? 0);
        } else if (categorySlug === 'car' || categorySlug === 'motorcycle') {
            payload.totalPrice =
                price + (payload.reRegistrationExempt ? 0 : Number(payload.reRegistrationFee ?? 0));
        } else {
            payload.totalPrice = price;
        }

        const viewings = payload.viewings as { date?: Date }[] | undefined;
        if (viewings?.length) {
            payload.showingDate = viewings[0]?.date;
        }
    }

    async listStoreProducts(
        storeId: string,
        query: { filter?: string; page: number; limit: number },
    ): Promise<OffsetPaginationResult<any>> {
        const filter: Record<string, any> = {};
        if (query.filter === 'active') filter.status = 'active';
        else if (query.filter === 'draft') filter.status = 'draft';
        else if (query.filter === 'promoted') filter['promotion.isActive'] = true;
        else if (query.filter === 'sold') filter.status = 'sold';

        return productRepository.findByStore(storeId, filter, query.page, query.limit);
    }

    async listMyProducts(
        userId: string,
        query: MyProductsQuery,
    ): Promise<OffsetPaginationResult<any>> {
        const filter: Record<string, any> = {};
        if (query.filter === 'active') filter.status = 'active';
        else if (query.filter === 'draft') filter.status = 'draft';
        else if (query.filter === 'promoted') filter['promotion.isActive'] = true;
        else if (query.filter === 'sold') filter.status = 'sold';
        else if (query.filter === 'expired') filter.status = 'expired';

        if (query.search) {
            const safeSearch = escapeRegex(query.search);
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        return productRepository.findMyProducts(userId, filter, query.page, query.limit);
    }

    async markAsSold(productId: string, userId: string, soldQty?: number): Promise<IProduct> {
        const existing = await productRepository.findById(productId);
        if (!existing) throw new NotFoundError('Product not found');
        if (String((existing as any).user) !== userId)
            throw new ForbiddenError('You can only update your own product');

        const qty = (existing as any).quantity;
        const currentSold = (existing as any).soldCount ?? 0;

        if (qty != null) {
            const available = qty - currentSold;
            const toSell = soldQty ?? 1;
            if (toSell > available) throw new ConflictError('Not enough available quantity');
            const newSold = currentSold + toSell;
            const remaining = qty - newSold;
            if (remaining <= 0) {
                await productRepository.updateById(productId, {
                    soldCount: newSold,
                    status: 'sold' as any,
                });
            } else {
                await productRepository.updateById(productId, { soldCount: newSold });
            }
        } else {
            await productRepository.updateById(productId, { status: 'sold' as any });
            await productRepository.incrementSoldCount(productId);
        }

        const updated = await productRepository.findById(productId);
        if (!updated) throw new NotFoundError('Product not found');
        return updated;
    }

    async approveProduct(productId: string): Promise<IProduct> {
        const existing = await productRepository.findById(productId);
        if (!existing) throw new NotFoundError('Product not found');

        const updateData: Record<string, unknown> = { status: 'active' };

        // Set listing expiry based on the purchased package or subscription duration
        const listingPurchaseId = (existing as any).listingPurchase;
        const userSubId = (existing as any).userSubscription;
        const now = new Date();

        if (listingPurchaseId) {
            const purchase = await ListingPurchaseModel.findById(listingPurchaseId).lean();
            if (purchase) {
                const durationMs = purchase.packageSnapshot.durationHours * 60 * 60 * 1000;
                updateData.listingExpiresAt = new Date(now.getTime() + durationMs);
            }
        } else if (userSubId) {
            const sub = await UserSubscriptionModel.findById(userSubId).lean();
            if (sub) {
                const durationMs = (sub as any).planSnapshot.listingDurationHours * 60 * 60 * 1000;
                updateData.listingExpiresAt = new Date(now.getTime() + durationMs);
            }
        }

        const updated = await productRepository.updateById(productId, updateData as any);
        if (!updated) throw new NotFoundError('Product not found');

        addActivityJob({
            activityType: 'listing_approved',
            actorId: String((existing as any).user),
            actorType: 'admin',
            targetId: productId,
            targetType: 'listing',
            message: `Listing ${(existing as any).title} was approved.`,
            metadata: { title: (existing as any).title },
        });

        return updated;
    }

    async rejectProduct(productId: string, rejectionReason?: string): Promise<IProduct> {
        const existing = await productRepository.findById(productId);
        if (!existing) throw new NotFoundError('Product not found');
        const update: Record<string, unknown> = { status: 'rejected' };
        if (rejectionReason) update.rejectionReason = rejectionReason;
        const updated = await productRepository.updateById(productId, update);
        if (!updated) throw new NotFoundError('Product not found');

        addActivityJob({
            activityType: 'listing_rejected',
            actorId: String((existing as any).user),
            actorType: 'admin',
            targetId: productId,
            targetType: 'listing',
            message: `Listing ${(existing as any).title} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
            metadata: { title: (existing as any).title, rejectionReason },
        });

        return updated;
    }

    async getListingDetail(
        listingId: string,
        viewerId?: string,
    ): Promise<{
        product: any;
        seller: any;
        isFavorite: boolean;
        isReported: boolean;
    }> {
        const product = await productRepository.findByIdWithSeller(listingId);
        if (!product) throw new NotFoundError('Listing not found');

        const isAdmin = viewerId ? await this.isAdminUser(viewerId) : false;

        if (!isAdmin && (product as any).status !== 'active') {
            throw new NotFoundError('Listing not found');
        }

        await productRepository.incrementViewCount(listingId);
        if (viewerId) {
            await productRepository.upsertRecentlyViewed(viewerId, listingId);
        }

        const productStore = (product as any).store;
        if (productStore) {
            enqueueInBackground(
                'store-tracking:store-click',
                storeTrackingProducer.addJob('store-click', {
                    storeId: String(productStore),
                    type: 'click',
                }),
            );
        }

        let isFavorite = false;
        let isReported = false;
        if (viewerId) {
            [isFavorite, isReported] = await Promise.all([
                productRepository.isFavorite(viewerId, listingId),
                productRepository.hasReported(viewerId, listingId),
            ]);
        }

        return { product, seller: (product as any).user, isFavorite, isReported };
    }

    private async isAdminUser(userId: string): Promise<boolean> {
        try {
            const user = await UserModel.findById(userId).select('role').lean();
            return user?.role === 'superAdmin';
        } catch {
            return false;
        }
    }

    async promoteProduct(productId: string, userId: string, planId: string): Promise<IProduct> {
        const existing = await productRepository.findById(productId);
        if (!existing) throw new NotFoundError('Product not found');
        if (String((existing as any).user) !== userId)
            throw new ForbiddenError('You can only promote your own product');
        if ((existing as any).status !== 'active')
            throw new ConflictError('Only active products can be promoted');

        const plan = await BoostPlanModel.findById(planId).lean();
        if (!plan) throw new NotFoundError('Boost plan not found');

        const now = new Date();
        const expiresAt = new Date(now.getTime() + (plan as any).durationHours * 60 * 60 * 1000);

        const updated = await productRepository.updateById(productId, {
            promotion: {
                isActive: true,
                plan: 'basic',
                startedAt: now,
                expiresAt,
                durationDays: Math.ceil((plan as any).durationHours / 24),
                purchaseDate: now,
                metadata: { boostScore: 0, backgroundColor: '#000000', label: (plan as any).name },
            },
        } as any);
        if (!updated) throw new NotFoundError('Product not found');
        return updated;
    }

    async createProduct(
        payload: IProductWritePayload,
        media: IMedia[],
        userId: string,
        categorySlug: string,
        storeId?: string,
        documents?: IDocument[],
        options?: RepositoryWriteOptions,
    ) {
        if (storeId) {
            const store = await storeRepository.findById(storeId);
            if (!store) throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
            if (store.status === 'blocked') throw new ForbiddenError('Store is blocked and cannot create listings');
            if (store.category.toString() !== payload.category) {
                throw new BadRequestError('Product category must match store category');
            }
        }

        // Check for active subscription or per-use purchase
        const purchaseId = (payload as any).purchaseId;
        let listingSource: 'subscription' | 'purchase' = 'purchase';
        let activeSubscription: any = null;
        let updatedPurchase: any = null;

        if (storeId) {
            activeSubscription = await userSubscriptionRepository.findActiveByUserAndStore(userId, storeId);
        }

        if (activeSubscription) {
            // Subscription path: consume a listing slot from the subscription
            const updated = await userSubscriptionRepository.consumeListingSlot(
                activeSubscription.id ?? activeSubscription._id?.toString(),
                userId,
                1,
            );
            if (!updated) {
                throw new BadRequestError('Subscription listing limit reached or subscription expired');
            }
            listingSource = 'subscription';
        } else {
            // Per-use purchase path (existing flow)
            if (!purchaseId) {
                throw new BadRequestError('A listing purchase or active subscription is required to create a product');
            }

            const purchase = await listingPurchaseRepository.findById(purchaseId);
            if (!purchase) throw new NotFoundError('Listing purchase not found');
            if (String((purchase as any).user) !== userId) {
                throw new ForbiddenError('This listing purchase does not belong to you');
            }
            if (purchase.status !== 'active') {
                throw new BadRequestError('All listing slots in this purchase have been used');
            }
            if (purchase.expiresAt <= new Date()) {
                throw new BadRequestError('This listing purchase has expired');
            }
            if (String(purchase.category) !== payload.category) {
                throw new BadRequestError(
                    `This purchase is for category "${purchase.packageSnapshot.categoryName}" but you are listing in a different category`,
                );
            }

            const remaining = purchase.packageSnapshot.maxListings - purchase.listingsUsed;
            if (remaining < 1) {
                throw new BadRequestError('No remaining listing slots in this purchase');
            }

            // Atomically consume a listing slot
            updatedPurchase = await listingPurchaseRepository.consumeListingSlot(purchaseId, userId, 1);
            if (!updatedPurchase) {
                throw new BadRequestError('Insufficient listing slots or purchase expired');
            }
        }

        this.applyDerivedFields(payload, categorySlug);

        const { latitude, longitude, ...locationRest } = payload.location!;
        const productData: Record<string, unknown> = {
            ...payload,
            location: {
                ...locationRest,
                coordinates: {
                    type: 'Point' as const,
                    coordinates: [longitude, latitude],
                },
            },
            media,
            user: userId,
        };

        if (documents?.length) {
            productData.documents = documents;
        }

        if (listingSource === 'subscription') {
            productData.userSubscription = activeSubscription.id ?? activeSubscription._id?.toString();
        } else {
            productData.listingPurchase = purchaseId;
        }

        if (storeId) {
            productData.store = storeId;
        }
        delete productData.storeId;
        delete productData.purchaseId;

        const created = await Product.create([productData], { session: (options as any)?.session });
        const product = created[0];

        await UserModel.findByIdAndUpdate(userId, { $inc: { totalProducts: 1 } });

        if (storeId) {
            await storeRepository.incrementProductCount(storeId);
            this.notifyStoreFollowers(storeId, product);
        }

        // Mark purchase as exhausted if all slots used (per-use purchase path only)
        if (listingSource === 'purchase' && updatedPurchase) {
            if (updatedPurchase.listingsUsed >= updatedPurchase.packageSnapshot.maxListings) {
                await listingPurchaseRepository.markExhausted(purchaseId);
            }
        }

        addActivityJob({
            activityType: 'listing_created',
            actorId: userId,
            actorType: 'user',
            targetId: product?._id?.toString() ?? product?.id,
            targetType: 'listing',
            message: `${payload.title} was listed.`,
            metadata: { title: payload.title, price: payload.price },
        });

        return product;
    }

    async listProductsByStore(
        storeId: string,
        query: ListProductsQuery,
        viewerId?: string,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IProduct>> {
        const store = await storeRepository.findById(storeId);
        if (!store || store.status === 'blocked') {
            return {
                data: [],
                meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
            };
        }
        const filter: Record<string, any> = {
            status: 'active',
            category: { $type: 'objectId' },
        };

        if (query.category) {
            filter.category.$eq = query.category;
        }

        if (query.search) {
            const safeSearch = escapeRegex(query.search);
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        if (query.condition) filter.condition = query.condition;
        if (query.brand) filter.brand = { $regex: escapeRegex(query.brand), $options: 'i' };

        if (query.minPrice || query.maxPrice) {
            filter.price = {};
            if (query.minPrice != null) filter.price.$gte = query.minPrice;
            if (query.maxPrice != null) filter.price.$lte = query.maxPrice;
        }

        if (viewerId) {
            const reportedIds = await productRepository.findReportedProductIds(viewerId);
            if (reportedIds.length) filter._id = { $nin: reportedIds };
        }

        return productRepository.findByStore(storeId, filter, query.page, query.limit, query.sort);
    }

    async listProducts(
        query: ListProductsQuery,
        viewerId?: string,
    ): Promise<OffsetPaginationResult<IProduct>> {
        const filter: Record<string, any> = {
            status: 'active',
            category: { $type: 'objectId' },
        };

        if (query.filter === 'recently_viewed') {
            return {
                data: [],
                meta: {
                    page: query.page,
                    limit: query.limit,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        }

        if (query.category) {
            filter.category.$eq = query.category;
        }

        if (query.search) {
            const safeSearch = escapeRegex(query.search);
            filter.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        if (query.condition) filter.condition = query.condition;
        if (query.brand) filter.brand = { $regex: escapeRegex(query.brand), $options: 'i' };
        if (query.city) filter['location.city'] = { $regex: escapeRegex(query.city), $options: 'i' };

        if (query.minPrice || query.maxPrice) {
            filter.price = {};
            if (query.minPrice != null) filter.price.$gte = query.minPrice;
            if (query.maxPrice != null) filter.price.$lte = query.maxPrice;
        }

        if (query.userId) {
            filter.user = query.userId;
        }

        // Transaction type
        if (query.transactionType) filter.transactionType = query.transactionType;

        // Vehicle filters
        if (query.carModel) filter.carModel = { $regex: escapeRegex(query.carModel), $options: 'i' };
        if (query.vehicleLocation) filter.vehicleLocation = query.vehicleLocation;
        if (query.vehicleType) filter.vehicleType = query.vehicleType;
        if (query.fuel) filter.fuel = query.fuel;
        if (query.transmission) filter.transmission = query.transmission;
        if (query.bodyType) filter.bodyType = query.bodyType;
        if (query.driveType) filter.driveType = query.driveType;
        if (query.warrantyType) filter.warrantyType = query.warrantyType;
        if (query.taxClass) filter.taxClass = query.taxClass;

        // Multi-select (comma-separated)
        const bodyColor = colorMatcher(query.bodyColor);
        if (bodyColor) filter.bodyColor = bodyColor;
        const interiorColor = colorMatcher(query.interiorColor);
        if (interiorColor) filter.interiorColor = interiorColor;
        if (query.equipment) filter.equipment = { $all: query.equipment.split(',').map(s => s.trim()) };
        if (query.facilities) filter.facilities = { $all: query.facilities.split(',').map(s => s.trim()) };

        // Property filters
        if (query.type) filter.type = query.type;
        if (query.ownershipType) filter.ownershipType = query.ownershipType;
        if (query.energyRating) filter.energyRating = query.energyRating;
        if (query.floorLevel) filter.floorLevel = query.floorLevel;
        if (query.showingDate) filter.showingDate = { $gte: query.showingDate };

        // Boat filters
        if (query.motorIncluded) filter.motorIncluded = query.motorIncluded === 'true';
        if (query.motorType) filter.motorType = query.motorType;
        if (query.buildMaterial) filter.buildMaterial = query.buildMaterial;

        // Motorcycle filters
        if (query.mcType) filter.mcType = query.mcType;
        if (query.mopedType) filter.mopedType = query.mopedType;
        if (query.motorcycleType) filter.motorcycleType = query.motorcycleType;

        // Bike filters
        if (query.bikeType) filter.bikeType = query.bikeType;

        // Job filters
        if (query.employmentType) filter.employmentType = query.employmentType;
        if (query.remoteWorkType) filter.remoteWorkType = query.remoteWorkType;
        if (query.workLanguage) filter.workLanguage = query.workLanguage;
        if (query.contractType) filter.contractType = query.contractType;
        if (query.sector) filter.sector = query.sector;

        // Book filters
        if (query.bookCategory) filter.bookCategory = query.bookCategory;

        // Range filters helper
        const addRange = (field: string, min?: number, max?: number) => {
            if (min != null || max != null) {
                filter[field] = {};
                if (min != null) filter[field].$gte = min;
                if (max != null) filter[field].$lte = max;
            }
        };

        addRange('mileage', query.minMileage, query.maxMileage);
        addRange('manufacturedYear', query.minYear, query.maxYear);
        addRange('horsepower', query.minHorsepower, query.maxHorsepower);
        addRange('seats', query.minSeats, query.maxSeats);
        addRange('trailerWeight', query.minTrailerWeight, query.maxTrailerWeight);
        addRange('usableArea', query.minUsableArea, query.maxUsableArea);
        addRange('bedrooms', query.minBedrooms, query.maxBedrooms);
        addRange('yearBuilt', query.minYearBuilt, query.maxYearBuilt);
        addRange('plotSize', query.minPlotSize, query.maxPlotSize);
        addRange('commonExpenses', query.minCommonExpenses, query.maxCommonExpenses);
        addRange('length', query.minLength, query.maxLength);
        addRange('width', query.minWidth, query.maxWidth);
        addRange('maxSpeedKnots', query.minMaxSpeedKnots, query.maxMaxSpeedKnots);
        addRange('sleepingPlaces', query.minSleepingPlaces, query.maxSleepingPlaces);
        addRange('displacement', query.minDisplacement, query.maxDisplacement);

        const blockedStoreIds = await productRepository.getBlockedStoreIds();
        if (blockedStoreIds.length) {
            filter.store = { $nin: blockedStoreIds };
        }

        if (query.near && query.radius) {
            const [lat, lng] = query.near.split(',').map(Number);
            filter['location.coordinates'] = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: query.radius * 1000,
                },
            };
        }

        let sort: string | undefined = query.sort;
        if (query.filter === 'today_best') {
            sort = '-soldCount -createdAt';
        }

        // Handle special sort keys
        if (sort === 'relevance') {
            sort = '-promotion.metadata.boostScore -createdAt';
        } else if (sort === 'nearest') {
            // $near already sorts by distance; omit explicit sort so distance order is preserved
            sort = query.near ? undefined : '-createdAt';
        }

        if (viewerId) {
            const reportedIds = await productRepository.findReportedProductIds(viewerId);
            if (reportedIds.length) {
                const existing = filter._id as Record<string, unknown> | undefined;
                filter._id = existing ? { ...existing, $nin: reportedIds } : { $nin: reportedIds };
            }
        }

        return productRepository.paginateOffset(filter, {
            page: query.page,
            limit: query.limit,
            sort: sort ?? '-createdAt',
        });
    }

    async getProductDetails(
        productId: string,
        viewerId?: string,
        options?: RepositoryQueryOptions,
    ) {
        const product = await productRepository.findByIdWithSeller(productId, options);
        if (!product) throw new NotFoundError('Product not found');

        await productRepository.incrementViewCount(productId);
        if (viewerId) {
            await productRepository.upsertRecentlyViewed(viewerId, productId);
        }

        const productStore = (product as any).store;
        if (productStore) {
            enqueueInBackground(
                'store-tracking:store-click',
                storeTrackingProducer.addJob('store-click', {
                    storeId: String(productStore),
                    type: 'click',
                }),
            );
        }

        let isFavorite = false;
        let isReported = false;
        if (viewerId) {
            isFavorite = await productRepository.isFavorite(viewerId, productId);
            isReported = await productRepository.hasReported(viewerId, productId);
        }

        return { product, isFavorite, isReported };
    }

    async enrichProductsWithViewerState(
        products: any[],
        viewerId: string,
    ): Promise<{ favoriteIds: Set<string>; reportedIds: Set<string> }> {
        const ids = products.map((p: any) => String(p._id ?? p.id));
        const [favoriteIds, reportedIds] = await Promise.all([
            ids.length
                ? productRepository.areFavorited(viewerId, ids)
                : Promise.resolve(new Set<string>()),
            ids.length
                ? productRepository.areReported(viewerId, ids)
                : Promise.resolve(new Set<string>()),
        ]);
        return { favoriteIds, reportedIds };
    }

    async updateMyProduct(
        productId: string,
        userId: string,
        payload: IProductWritePayload,
        categorySlug: string,
        storeId?: string,
        newMedia?: IMedia[],
        newDocuments?: IDocument[],
        options?: RepositoryWriteOptions,
    ) {
        const existing = await productRepository.findById(productId, options);
        if (!existing) throw new NotFoundError('Product not found');

        if (String((existing as any).user) !== userId) {
            throw new ForbiddenError('You can only update your own product');
        }

        // Block category change on products with listing purchases
        if (
            (existing as any).listingPurchase &&
            payload.category &&
            payload.category !== String((existing as any).category)
        ) {
            throw new BadRequestError('Cannot change category on a listing with a listing purchase');
        }

        const targetStoreId = storeId || (existing as any).store;
        const targetCategory = payload.category || (existing as any).category;

        if (targetStoreId) {
            const store = await storeRepository.findById(targetStoreId);
            if (!store) throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');
            if (store.status === 'blocked') throw new ForbiddenError('Store is blocked and cannot update listings');
            if (store.category.toString() !== targetCategory) {
                throw new BadRequestError('Product category must match store category');
            }
        }

        if (newMedia?.length) {
            const oldMedia = (existing as any).media || [];
            for (const media of oldMedia) {
                if (media.publicId) {
                    const filePath = getFilePath(media.publicId, 'products');
                    fs.unlink(filePath, () => {});
                }
            }
            (payload as any).media = newMedia;
        }

        if (newDocuments?.length) {
            (payload as any).documents = newDocuments;
        }

        if (payload.location) {
            const { latitude, longitude, ...locationRest } = payload.location;
            if (latitude !== undefined && longitude !== undefined) {
                (payload as any).location = {
                    ...locationRest,
                    coordinates: {
                        type: 'Point' as const,
                        coordinates: [longitude, latitude],
                    },
                };
            }
        }

        this.applyDerivedFields(payload, categorySlug);

        const updated = await productRepository.updateById(productId, payload as any, options);

        if ((payload as any).status === 'sold' && (existing as any).status !== 'sold') {
            await productRepository.incrementSoldCount(productId);
        }

        return updated;
    }

    async softDeleteMyProduct(productId: string, userId: string, options?: RepositoryWriteOptions) {
        const existing = await productRepository.findById(productId, options);
        if (!existing) throw new NotFoundError('Product not found');
        if (String((existing as any).user) !== userId)
            throw new ForbiddenError('You can only delete your own product');

        if ((existing as any).isDeleted) return;

        await productRepository.updateById(
            productId,
            { isDeleted: true, deletedAt: new Date(), status: ProductStatus.REMOVED },
            options,
        );

        await productRepository.deleteRecentlyViewedByProduct(productId);

        await UserModel.findByIdAndUpdate(userId, { $inc: { totalProducts: -1 } });
    }

    async toggleFavorite(productId: string, userId: string, options?: RepositoryWriteOptions) {
        const p = await productRepository.findById(productId, options);
        if (!p) throw new NotFoundError('Product not found');
        const isFavorite = await productRepository.toggleFavorite(userId, productId, options);
        return { isFavorite };
    }

    async reportProduct(
        productId: string,
        userId: string,
        payload: ReportProductBody,
        options?: RepositoryWriteOptions,
    ) {
        const p = await productRepository.findById(productId, options);
        if (!p) throw new NotFoundError('Product not found');

        const already = await productRepository.hasReported(userId, productId);
        if (already) throw new ConflictError('You already reported this product');

        await productRepository.createReport(
            { product: productId, reporter: userId, ...payload },
            options,
        );

        addActivityJob({
            activityType: 'listing_flagged',
            actorId: userId,
            actorType: 'user',
            targetId: productId,
            targetType: 'listing',
            message: `Listing ${(p as any).title} was flagged as ${payload.reason}.`,
            metadata: { title: (p as any).title, reason: payload.reason },
        });
    }

    private async notifyStoreFollowers(storeId: string, product: any) {
        const followers = (await StoreFollowModel.find({ store: storeId as any })
            .populate('user', 'notificationToken deviceType')
            .lean()) as any[];

        const productId = String(product._id);
        const deepLink = deepLinkService.buildProductAppLink(productId);

        for (const f of followers) {
            if (f.user) {
                await notificationService.createNotification({
                    userId: f.user._id as any,
                    title: 'New Product Alert!',
                    message: `${product.title} is now available in a store you follow`,
                    type: 'new_product',
                    metadata: { productId, storeId, deepLink },
                });

                if (f.user.notificationToken) {
                    sendPushNotification({
                        token: f.user.notificationToken,
                        title: 'New Product Alert!',
                        body: `${product.title} is now available in a store you follow`,
                        data: { type: 'new_product', productId, deepLink },
                    }).catch(() => {});
                }
            }
        }
    }
}

export const productService = new ProductService();
