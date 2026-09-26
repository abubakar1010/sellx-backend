export const serializeStoryPurchase = (purchase: any) => ({
    id: purchase.id ?? String(purchase._id ?? ''),
    packageSnapshot: purchase.packageSnapshot,
    storiesUsed: purchase.storiesUsed ?? 0,
    storiesRemaining: Math.max(
        0,
        (purchase.packageSnapshot?.maxStories ?? 0) - (purchase.storiesUsed ?? 0),
    ),
    status: purchase.status,
    purchasedAt: purchase.purchasedAt,
    expiresAt: purchase.expiresAt,
    createdAt: purchase.createdAt,
});

export const serializeStoryPurchases = (purchases: any[]) =>
    purchases.map(serializeStoryPurchase);
