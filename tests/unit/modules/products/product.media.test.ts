import { Product } from '../../../../src/modules/products/products.model';

const base = {
    user: '507f1f77bcf86cd799439011',
    category: '507f1f77bcf86cd799439012',
    title: 'Rolex Submariner',
    price: 145000,
    location: { address: 'Karl Johans gate 1' },
};

const image = { url: '/uploads/products/9f1c2d3e.jpg', publicId: '9f1c2d3e.jpg' };

/**
 * The lower bound moved to the controller, which knows the category: every form
 * needs at least one image except the property "wanted to rent" ad. The model
 * keeps the upper bound.
 */
describe('listing media bounds', () => {
    it('allows an empty set, which the wanted-to-rent form submits', async () => {
        await expect(new Product({ ...base, media: [] }).validate()).resolves.toBeUndefined();
    });

    it('allows the field to be omitted entirely', async () => {
        await expect(new Product({ ...base }).validate()).resolves.toBeUndefined();
    });

    it('allows up to ten images', async () => {
        const media = Array.from({ length: 10 }, () => image);

        await expect(new Product({ ...base, media }).validate()).resolves.toBeUndefined();
    });

    it('rejects an eleventh image', async () => {
        const media = Array.from({ length: 11 }, () => image);

        await expect(new Product({ ...base, media }).validate()).rejects.toThrow(
            'Media cannot exceed 10 items',
        );
    });
});
