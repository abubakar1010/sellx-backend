export const serializeUserSubscription = (sub: any) => ({
    id: sub.id ?? String(sub._id ?? ''),
    store: sub.store?._id
        ? {
              id: sub.store._id?.toString() ?? sub.store.id,
              name: sub.store.name ?? '',
              logo: sub.store.logo,
          }
        : typeof sub.store === 'string' || sub.store?.toString
          ? sub.store.toString()
          : sub.store,
    planSnapshot: sub.planSnapshot,
    listingsUsed: sub.listingsUsed ?? 0,
    listingsRemaining:
        sub.planSnapshot?.maxListings === -1
            ? -1
            : Math.max(0, (sub.planSnapshot?.maxListings ?? 0) - (sub.listingsUsed ?? 0)),
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    autoRenew: sub.autoRenew,
    cancelledAt: sub.cancelledAt,
    createdAt: sub.createdAt,
});

export const serializeUserSubscriptions = (subs: any[]) =>
    subs.map(serializeUserSubscription);
