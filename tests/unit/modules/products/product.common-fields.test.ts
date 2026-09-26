/**
 * `productCommonSchema` — the fields every one of the 11 categories carries.
 *
 * A bug here is an 11× bug, which is why three of the four defects this audit found live in
 * this file's territory. The tests that pin those fixes are marked FIXED, with the behaviour
 * they replaced spelled out, so nobody reintroduces `z.coerce` here by reflex.
 *
 * Driven through `sellx` for brevity, with a second slug wherever the point is that the field is
 * genuinely shared rather than a SellX quirk.
 */
import { CURRENCY_ERROR } from '@/core/constants/currency';
import { getProductSchema } from '@/modules/products/schemas/registry';
import { validListing } from '@tests/factories/product.factory';

const parse = (slug: string, body: unknown) => getProductSchema(slug).safeParse(body);

const failedFields = (slug: string, body: unknown): string[] => {
    const result = parse(slug, body);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

const messagesFor = (slug: string, body: unknown, field: string): string[] => {
    const result = parse(slug, body);
    return result.success
        ? []
        : result.error.issues.filter((i) => i.path.join('.') === field).map((i) => i.message);
};

const sellx = (overrides: Record<string, unknown> = {}) => validListing('sellx', overrides);
const data = (body: unknown, slug = 'sellx'): Record<string, unknown> => {
    const result = parse(slug, body);
    if (!result.success) throw new Error(`expected a valid listing: ${result.error.message}`);
    return result.data as Record<string, unknown>;
};

describe('location', () => {
    const at = (o: Record<string, unknown>) => sellx({ location: { address: 'A road', ...o } });

    it('accepts a coordinate as a number or as a numeric string', () => {
        expect(data(at({ latitude: 59.9139, longitude: 10.7522 })).location).toMatchObject({
            latitude: 59.9139,
            longitude: 10.7522,
        });
        expect(data(at({ latitude: '59.9139', longitude: '10.7522' })).location).toMatchObject({
            latitude: 59.9139,
            longitude: 10.7522,
        });
    });

    it('accepts the southern and western hemispheres', () => {
        expect(data(at({ latitude: -33.8688, longitude: -151.2093 })).location).toMatchObject({
            latitude: -33.8688,
            longitude: -151.2093,
        });
    });

    it('accepts the poles and the antimeridian', () => {
        expect(parse('sellx', at({ latitude: 90, longitude: 180 })).success).toBe(true);
        expect(parse('sellx', at({ latitude: -90, longitude: -180 })).success).toBe(true);
    });

    it.each([
        [91, 10],
        [-91, 10],
        [59, 181],
        [59, -181],
    ])('rejects a coordinate outside the globe: %p, %p', (latitude, longitude) => {
        expect(failedFields('sellx', at({ latitude, longitude })).length).toBeGreaterThan(0);
    });

    // FIXED. These all used to coerce to 0 and pass, filing the listing at 0°N 0°E in the Gulf of
    // Guinea, where every "near me" search would find it. `z.coerce.number()` is the trap.
    it.each([[''], ['   '], [null], [true], [false], [[]], [{}], ['abc'], ['59,9139'], [NaN]])(
        'rejects %p instead of reading it as a coordinate',
        (latitude) => {
            expect(failedFields('sellx', at({ latitude, longitude: 10.7 }))).toContain(
                'location.latitude',
            );
        },
    );

    it('names the field it wants when a coordinate is missing', () => {
        expect(messagesFor('sellx', at({ longitude: 10.7 }), 'location.latitude')).toEqual([
            'Latitude must be a number, for example 59.9139',
        ]);
        expect(messagesFor('sellx', at({ latitude: 59.9 }), 'location.longitude')).toEqual([
            'Longitude must be a number, for example 10.7522',
        ]);
    });

    it('requires an address of at least two characters, after trimming', () => {
        const coords = { latitude: 59.9, longitude: 10.7 };

        expect(failedFields('sellx', at({ address: ' a ', ...coords }))).toContain('location.address');
        expect(failedFields('sellx', at({ address: '', ...coords }))).toContain('location.address');
        expect(parse('sellx', at({ address: '  Torget  ', ...coords })).success).toBe(true);
    });

    it('leaves city and country optional', () => {
        const parsed = data(at({ latitude: 59.9, longitude: 10.7 }));
        expect(parsed.location).not.toHaveProperty('city');
    });

    it('is required on every category, not just the simple ones', () => {
        expect(failedFields('car', validListing('car:personbil', { location: undefined }))).toContain(
            'location',
        );
        expect(failedFields('job', validListing('job', { location: undefined }))).toContain(
            'location',
        );
    });
});

describe('videoLink and the other link fields', () => {
    it.each([['https://youtu.be/abc'], ['http://example.com/a?b=c'], ['https://a.example.com:8443/x']])(
        'accepts %s',
        (videoLink) => {
            expect(data(sellx({ videoLink })).videoLink).toBe(videoLink);
        },
    );

    it.each([['not-a-url'], ['example.com'], ['//evil.example.com'], ['http://']])(
        'rejects %p, which is not a URL',
        (videoLink) => {
            expect(failedFields('sellx', sellx({ videoLink }))).toContain('videoLink');
        },
    );

    // FIXED. `z.url()` validates syntax, not scheme, so these all used to pass — and the client
    // renders videoLink straight into an href.
    it.each([
        ['javascript:alert(1)'],
        ['data:text/html,<script>alert(1)</script>'],
        ['ftp://example.com/file'],
        ['file:///etc/passwd'],
    ])('rejects the %p scheme', (videoLink) => {
        expect(messagesFor('sellx', sellx({ videoLink }), 'videoLink')).toContain(
            'Link must start with http:// or https://',
        );
    });

    it('applies the same rule to the job form website and linkedin fields', () => {
        expect(failedFields('job', validListing('job', { website: 'javascript:alert(1)' }))).toContain(
            'website',
        );
        expect(
            failedFields('job', validListing('job', { linkedin: 'javascript:alert(1)' })),
        ).toContain('linkedin');
    });
});

describe('viewings', () => {
    const withViewing = (viewing: unknown) =>
        validListing('property:for_rent', { viewings: [viewing] });

    it.each([['00:00'], ['09:00'], ['23:59'], ['12:30']])('accepts %s as a time', (fromTime) => {
        expect(parse('property', withViewing({ date: '2026-09-14', fromTime })).success).toBe(true);
    });

    it.each([['24:00'], ['9:00'], ['09:60'], ['1730'], ['17.30'], ['17:00:00'], ['']])(
        'rejects %p as a time',
        (fromTime) => {
            expect(failedFields('property', withViewing({ date: '2026-09-14', fromTime }))).toContain(
                'viewings.0.fromTime',
            );
        },
    );

    it('reports the index of the viewing that failed', () => {
        const body = validListing('property:for_rent', {
            viewings: [
                { date: '2026-09-14', fromTime: '17:00' },
                { date: '2026-09-16', fromTime: '25:00' },
            ],
        });
        expect(failedFields('property', body)).toContain('viewings.1.fromTime');
    });

    it('accepts an ISO date, a Date and an epoch', () => {
        for (const date of ['2026-09-14', new Date('2026-09-14'), 1789379200000]) {
            expect(parse('property', withViewing({ date })).success).toBe(true);
        }
    });

    // FIXED. `z.coerce.date()` returns an Invalid Date rather than throwing, so a missing or
    // unparseable date surfaced as Zod's own "Invalid input: expected date, received Date" —
    // which is the text the client put in front of the user.
    it.each([[undefined], ['not-a-date'], ['2026-13-45']])(
        'gives a readable message for the unparseable date %p',
        (date) => {
            expect(messagesFor('property', withViewing({ date }), 'viewings.0.date')).toEqual([
                'Viewing date must be a valid date, for example 2026-09-14',
            ]);
        },
    );

    // FIXED. `new Date(null)`, `new Date(true)` and `new Date([])` are all 1 January 1970, so a
    // null viewing date was accepted and stored as the Unix epoch.
    it.each([[null], [true], [[]], [{}], ['']])('rejects %p rather than storing the epoch', (date) => {
        expect(failedFields('property', withViewing({ date }))).toContain('viewings.0.date');
    });

    // Reported, not fixed: `property.schema.ts` has an ordering rule for rentalPeriod but the
    // viewing times have none, so an end before the start is stored as sent.
    it.todo('should reject a viewing whose toTime is before its fromTime');
});

describe('the ObjectId fields', () => {
    it.each([
        ['purchaseId', 'Invalid purchase ID'],
        ['category', 'Invalid category ID'],
        ['storeId', 'Invalid store ID'],
    ])('%s accepts 24 hex characters and names itself when it does not', (field, message) => {
        expect(parse('sellx', sellx({ [field]: '507f1f77bcf86cd799439011' })).success).toBe(true);
        expect(parse('sellx', sellx({ [field]: '507F1F77BCF86CD799439011' })).success).toBe(true);

        for (const bad of ['507f1f77bcf86cd79943901', '507f1f77bcf86cd7994390111', 'zzz', '']) {
            expect(messagesFor('sellx', sellx({ [field]: bad }), field)).toContain(message);
        }
    });
});

describe('contacts', () => {
    it('defaults to an empty array', () => {
        expect(data(sellx()).contacts).toEqual([]);
    });

    it.each([['phone'], ['email'], ['whatsapp']])('accepts a %s contact', (type) => {
        expect(parse('sellx', sellx({ contacts: [{ type, value: '+4790000000' }] })).success).toBe(
            true,
        );
    });

    it('rejects an unknown contact type on the indexed path', () => {
        expect(failedFields('sellx', sellx({ contacts: [{ type: 'fax', value: '123' }] }))).toContain(
            'contacts.0.type',
        );
    });

    it('requires a value of at least two characters, on the right index', () => {
        const body = sellx({
            contacts: [
                { type: 'phone', value: '+4790000000' },
                { type: 'email', value: 'a' },
            ],
        });
        expect(failedFields('sellx', body)).toContain('contacts.1.value');
    });
});

describe('privacy', () => {
    it('is absent when not sent', () => {
        expect(data(sellx())).not.toHaveProperty('privacy');
    });

    it('fills in all three flags when sent empty', () => {
        expect(data(sellx({ privacy: {} })).privacy).toEqual({
            hideName: false,
            hideProfile: false,
            hidePhone: false,
        });
    });

    it('keeps what was sent and defaults the rest', () => {
        expect(data(sellx({ privacy: { hidePhone: true } })).privacy).toEqual({
            hideName: false,
            hideProfile: false,
            hidePhone: true,
        });
    });

    it('rejects a non-boolean flag on its own path', () => {
        expect(failedFields('sellx', sellx({ privacy: { hideName: 'yes' } }))).toContain(
            'privacy.hideName',
        );
    });
});

describe('quantity and currency', () => {
    it('takes a whole number or a whole-number string', () => {
        expect(data(sellx({ quantity: 3 })).quantity).toBe(3);
        expect(data(sellx({ quantity: '3' })).quantity).toBe(3);
        expect(data(sellx({ quantity: 0 })).quantity).toBe(0);
    });

    it.each([[''], ['   '], [null], [true], [[]], ['3.0'], ['1 000']])(
        'rejects the quantity %p rather than reading it as a number',
        (quantity) => {
            expect(failedFields('sellx', sellx({ quantity }))).toContain('quantity');
        },
    );

    it('rejects a fractional quantity and one over ten thousand', () => {
        expect(messagesFor('sellx', sellx({ quantity: 1.5 }), 'quantity')).toContain(
            'Quantity must be a whole number',
        );
        expect(messagesFor('sellx', sellx({ quantity: 10_001 }), 'quantity')).toContain(
            'Quantity cannot exceed 10,000',
        );
        expect(parse('sellx', sellx({ quantity: 10_000 })).success).toBe(true);
    });

    it('defaults the currency to NOK and takes nothing else', () => {
        expect(data(sellx()).currency).toBe('NOK');
        expect(data(sellx({ currency: 'NOK' })).currency).toBe('NOK');

        for (const currency of ['USD', 'EUR', 'nok', '', 1]) {
            expect(messagesFor('sellx', sellx({ currency }), 'currency')).toContain(CURRENCY_ERROR);
        }
    });
});

describe('contactPersons on the job form', () => {
    const withPeople = (contactPersons: unknown) => validListing('job', { contactPersons });

    it('defaults to an empty array', () => {
        expect(data(validListing('job', { contactPersons: undefined }), 'job').contactPersons).toEqual(
            [],
        );
    });

    it('requires a name of at least two characters', () => {
        expect(failedFields('job', withPeople([{ name: 'K' }]))).toContain('contactPersons.0.name');
        expect(parse('job', withPeople([{ name: 'Kari Nordmann' }])).success).toBe(true);
    });

    it('lower-cases the email and rejects a malformed one', () => {
        const parsed = data(withPeople([{ name: 'Kari Nordmann', email: 'Kari@Example.COM' }]), 'job');
        expect((parsed.contactPersons as { email: string }[])[0]!.email).toBe('kari@example.com');
        expect(
            failedFields('job', withPeople([{ name: 'Kari Nordmann', email: 'not-an-email' }])),
        ).toContain('contactPersons.0.email');
    });

    it('takes at most ten', () => {
        const person = { name: 'Kari Nordmann' };
        expect(parse('job', withPeople(Array.from({ length: 10 }, () => person))).success).toBe(true);
        expect(parse('job', withPeople(Array.from({ length: 11 }, () => person))).success).toBe(false);
    });
});

describe('the body itself', () => {
    it.each([[undefined], [null], [[]], ['a string'], [42]])(
        'reports a single issue for the non-object body %p',
        (body) => {
            const result = parse('sellx', body);
            expect(result.success).toBe(false);
            if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
        },
    );

    it('strips anything the schema does not name', () => {
        // `totalPrice` and `status` are server-derived: a client that sends them must not win.
        const parsed = data(sellx({ isAdmin: true, totalPrice: 1, status: 'active', views: 9000 }));

        for (const field of ['isAdmin', 'totalPrice', 'status', 'views']) {
            expect(parsed).not.toHaveProperty(field);
        }
    });
});
