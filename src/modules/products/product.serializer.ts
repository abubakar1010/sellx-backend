import type { IProduct } from './product.interface';

const toStr = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof (val as any).toHexString === 'function') return (val as any).toHexString();
    if (typeof (val as any).toString === 'function') return (val as any).toString();
    return '';
};

const SKIP_FIELDS = new Set([
    'user', '_id', '__v', 'id',
    '$__', '_doc', '$isNew', 'owned',
    'activePaths', 'pathsToScopes', 'cachedRequired',
    'savedState', 'saveOptions', 'validating',
    'validationError', '$versionError', 'op', 'saving',
    'backup', 'inserting',
]);

/** `hidePhone` covers every way a listing can carry a number. */
const PHONE_CONTACT_TYPES = new Set(['phone', 'whatsapp']);

export interface SerializeProductOptions {
    isFavorite?: boolean;
    isReported?: boolean;
    favoriteIds?: Set<string>;
    reportedIds?: Set<string>;
    /** The signed-in user. A seller always sees their own details unmasked. */
    viewerId?: string;
    /** Moderation views need the seller's details whatever the privacy flags say. */
    revealSeller?: boolean;
}

export const serializeProduct = (product: any, opts?: SerializeProductOptions) => {
    const doc = typeof product?.toObject === 'function' ? product.toObject() : product;
    const productId = toStr(doc._id ?? doc.id);
    const userId = doc.user?._id ?? doc.user;
    const seller = typeof doc.user === 'object' && doc.user !== null && doc.user._id ? doc.user : {};

    /**
     * The spec's privacy settings, which apply to every category: a seller may
     * hide their name, profile picture and phone number. The flags were stored
     * but never applied on read, so the details went out regardless.
     *
     * The seller themselves, and a moderation view, always see the real values.
     */
    const privacy = doc.privacy ?? {};
    const unmasked = opts?.revealSeller === true || (!!opts?.viewerId && opts.viewerId === toStr(userId));
    const hidden = (flag: unknown): boolean => !unmasked && flag === true;

    const contacts: { type?: string; value?: string }[] = doc.contacts ?? [];

    return {
        id: productId,
        category: doc.category,
        media: doc.media,
        title: doc.title,
        description: doc.description,
        price: doc.price,
        currency: doc.currency,
        transactionType: doc.transactionType,

        facilities: doc.facilities,
        privacy: doc.privacy,
        promotion: doc.promotion,
        listingExpiresAt: doc.listingExpiresAt ?? null,
        status: doc.status,
        quantity: doc.quantity ?? 0,
        favoriteCount: doc.favoriteCount ?? 0,
        soldCount: doc.soldCount ?? 0,
        viewCount: doc.viewCount ?? 0,

        seller: {
            id: toStr(userId),
            firstName: hidden(privacy.hideName) ? undefined : seller.firstName,
            lastName: hidden(privacy.hideName) ? undefined : seller.lastName,
            avatarUrl: hidden(privacy.hideProfile) ? undefined : seller.avatarUrl,
            avgRating: seller.avgRating ?? 0,
            totalReviewCount: seller.totalReviewCount ?? 0,
            phone: hidden(privacy.hidePhone) ? undefined : seller.phone,
        },

        ...Object.fromEntries(Object.entries(doc).filter(([k]) => !SKIP_FIELDS.has(k))),

        // After the spread: the raw document carries its own `location` and
        // `contacts`, which would otherwise overwrite the shaped ones below.
        location: doc.location
            ? {
                  ...doc.location,
                  latitude: doc.location?.coordinates?.coordinates?.[1] ?? null,
                  longitude: doc.location?.coordinates?.coordinates?.[0] ?? null,
              }
            : null,
        contacts: hidden(privacy.hidePhone)
            ? contacts.filter((contact) => !PHONE_CONTACT_TYPES.has(String(contact?.type)))
            : contacts,

        isFavorite: opts?.favoriteIds?.has(productId) ?? opts?.isFavorite ?? false,
        isReported: opts?.reportedIds?.has(productId) ?? opts?.isReported ?? false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
};

export const serializeProducts = (rows: any[], opts?: SerializeProductOptions) =>
    rows.map((p) => serializeProduct(p, opts));
