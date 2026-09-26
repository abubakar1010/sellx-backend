export const serializeListingPurchase = (purchase: any) => ({
    id: purchase.id ?? String(purchase._id ?? ''),
    packageSnapshot: purchase.packageSnapshot,
    listingsUsed: purchase.listingsUsed ?? 0,
    listingsRemaining: Math.max(
        0,
        (purchase.packageSnapshot?.maxListings ?? 0) - (purchase.listingsUsed ?? 0),
    ),
    status: purchase.status,
    purchasedAt: purchase.purchasedAt,
    expiresAt: purchase.expiresAt,
    createdAt: purchase.createdAt,
});

export const serializeListingPurchases = (purchases: any[]) =>
    purchases.map(serializeListingPurchase);
