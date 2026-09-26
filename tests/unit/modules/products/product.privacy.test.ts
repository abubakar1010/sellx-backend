import { serializeProduct } from '../../../../src/modules/products/product.serializer';

const SELLER_ID = '507f1f77bcf86cd799439011';
const VIEWER_ID = '507f1f77bcf86cd799439099';

const build = (privacy: Record<string, boolean>) => ({
    _id: '68b3f1c2a4d5e6f708091d10',
    user: {
        _id: SELLER_ID,
        firstName: 'Ola',
        lastName: 'Nordmann',
        avatarUrl: '/uploads/avatars/ola.jpg',
        phone: '+4790012345',
    },
    title: 'Trek Marlin 7',
    price: 6500,
    privacy,
    contacts: [
        { type: 'phone', value: '+47 900 12 345' },
        { type: 'whatsapp', value: '+47 900 12 345' },
        { type: 'email', value: 'ola@example.com' },
    ],
    location: {
        address: 'Karl Johans gate 1',
        city: 'Oslo',
        coordinates: { type: 'Point', coordinates: [10.7522, 59.9139] },
    },
});

/**
 * The spec's privacy settings apply to every category: a seller may hide their
 * name, profile picture and phone number. The flags were stored but never
 * applied on read.
 */
describe('listing privacy', () => {
    it('returns everything when no flag is set', () => {
        const result = serializeProduct(build({}));

        expect(result.seller.firstName).toBe('Ola');
        expect(result.seller.avatarUrl).toBe('/uploads/avatars/ola.jpg');
        expect(result.seller.phone).toBe('+4790012345');
        expect(result.contacts).toHaveLength(3);
    });

    it('hides the name', () => {
        const result = serializeProduct(build({ hideName: true }));

        expect(result.seller.firstName).toBeUndefined();
        expect(result.seller.lastName).toBeUndefined();
        expect(result.seller.avatarUrl).toBe('/uploads/avatars/ola.jpg');
    });

    it('hides the profile picture', () => {
        const result = serializeProduct(build({ hideProfile: true }));

        expect(result.seller.avatarUrl).toBeUndefined();
        expect(result.seller.firstName).toBe('Ola');
    });

    it('hides the phone number, and any contact carrying one', () => {
        const result = serializeProduct(build({ hidePhone: true }));

        expect(result.seller.phone).toBeUndefined();
        expect(result.contacts).toEqual([{ type: 'email', value: 'ola@example.com' }]);
    });

    it('still reports the rating, which is not private', () => {
        const result = serializeProduct(build({ hideName: true, hideProfile: true, hidePhone: true }));

        expect(result.seller.id).toBe(SELLER_ID);
        expect(result.seller.avgRating).toBe(0);
        expect(result.seller.totalReviewCount).toBe(0);
    });

    it('still returns the flags themselves, so the owner can see their setting', () => {
        const result = serializeProduct(build({ hideName: true }));

        expect(result.privacy).toEqual({ hideName: true });
    });

    it('shows the seller their own details', () => {
        const all = { hideName: true, hideProfile: true, hidePhone: true };
        const result = serializeProduct(build(all), { viewerId: SELLER_ID });

        expect(result.seller.firstName).toBe('Ola');
        expect(result.seller.avatarUrl).toBe('/uploads/avatars/ola.jpg');
        expect(result.seller.phone).toBe('+4790012345');
        expect(result.contacts).toHaveLength(3);
    });

    it('masks for any other signed-in viewer', () => {
        const result = serializeProduct(build({ hidePhone: true }), { viewerId: VIEWER_ID });

        expect(result.seller.phone).toBeUndefined();
    });

    it('reveals everything to a moderation view', () => {
        const all = { hideName: true, hideProfile: true, hidePhone: true };
        const result = serializeProduct(build(all), { revealSeller: true });

        expect(result.seller.firstName).toBe('Ola');
        expect(result.seller.phone).toBe('+4790012345');
        expect(result.contacts).toHaveLength(3);
    });
});

/** The raw document's own `location` used to overwrite the shaped one. */
describe('listing location', () => {
    it('returns the coordinates flattened as well as in GeoJSON', () => {
        const result = serializeProduct(build({}));

        expect(result.location).toEqual({
            address: 'Karl Johans gate 1',
            city: 'Oslo',
            coordinates: { type: 'Point', coordinates: [10.7522, 59.9139] },
            latitude: 59.9139,
            longitude: 10.7522,
        });
    });

    it('returns null when the listing has no location', () => {
        const result = serializeProduct({ ...build({}), location: undefined });

        expect(result.location).toBeNull();
    });
});
