import { config } from '@/config';
import { BadRequestError, UnauthorizedError } from '@/core/errors';
import jwt from 'jsonwebtoken';

const APPLE_CERTS_URL = 'https://appleid.apple.com/auth/keys';

let appleCerts: Record<string, string> | null = null;
let appleCertsFetchedAt = 0;
const APPLE_CERTS_CACHE_MS = 60 * 60 * 1000;

const getAppleCerts = async (signal?: AbortSignal): Promise<Record<string, string>> => {
    const now = Date.now();
    if (appleCerts && now - appleCertsFetchedAt < APPLE_CERTS_CACHE_MS) {
        return appleCerts;
    }

    const response = await fetch(APPLE_CERTS_URL, { signal });
    if (!response.ok) {
        throw new UnauthorizedError('Failed to fetch Apple verification keys', 'APPLE_CERTS_FETCH_FAILED');
    }

    const data = (await response.json()) as { keys: Array<{ kid: string; kty: string; n: string; e: string }> };
    const certs: Record<string, string> = {};

    for (const key of data.keys) {
        const jwk = {
            kty: key.kty,
            kid: key.kid,
            use: 'sig',
            alg: 'RS256',
            n: key.n,
            e: key.e,
        };

        const pem = jwkToPem(jwk);
        certs[key.kid] = pem;
    }

    appleCerts = certs;
    appleCertsFetchedAt = now;
    return certs;
};

const base64urlToBase64 = (base64url: string): string => {
    return base64url.replace(/-/g, '+').replace(/_/g, '/');
};

const jwkToPem = (jwk: { kty: string; n: string; e: string }): string => {
    const n = Buffer.from(base64urlToBase64(jwk.n), 'base64');
    const e = Buffer.from(base64urlToBase64(jwk.e), 'base64');

    const nHex = n.toString('hex');
    const eHex = e.toString('hex');

    const derSequence = '30';
    const derInteger = '02';
    const derVersion = '00';

    const modulus = derInteger + lengthToHex(nHex) + nHex;
    const exponent = derInteger + lengthToHex(eHex) + eHex;
    const inner = modulus + exponent;
    const publicKey = derSequence + lengthToHex(inner) + inner;

    const derBytes = Buffer.from(publicKey, 'hex');
    const base64 = derBytes.toString('base64');

    const lines = base64.match(/.{1,64}/g) || [];

    return `-----BEGIN RSA PUBLIC KEY-----\n${lines.join('\n')}\n-----END RSA PUBLIC KEY-----`;
};

const lengthToHex = (hex: string): string => {
    const length = hex.length / 2;
    if (length < 0x80) {
        return length.toString(16).padStart(2, '0');
    }
    const lengthBytes = [];
    let temp = length;
    while (temp > 0) {
        lengthBytes.unshift(temp & 0xff);
        temp >>= 8;
    }
    return (0x80 | lengthBytes.length).toString(16) + lengthBytes.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export interface AppleProfile {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    emailVerified: boolean;
}

export const mapAppleProfile = (raw: Record<string, unknown>, displayName?: string): AppleProfile => {
    const id = typeof raw.sub === 'string' ? raw.sub : '';
    const email = typeof raw.email === 'string' ? raw.email : '';
    const name = displayName || email || 'Apple User';
    const emailVerified = raw.email_verified === true || (typeof raw.email === 'string' && email.length > 0);

    if (!id) {
        throw new BadRequestError(
            'Apple profile payload is incomplete.',
            'APPLE_PROFILE_INVALID',
        );
    }

    return {
        id,
        email: email.toLowerCase(),
        name,
        emailVerified,
    };
};

export const verifyAppleIdentityToken = async (
    identityToken: string,
    signal?: AbortSignal,
): Promise<AppleProfile> => {
    const certs = await getAppleCerts(signal);

    const decodedHeader = jwt.decode(identityToken, { complete: true });
    if (!decodedHeader || typeof decodedHeader.header !== 'object' || !decodedHeader.header.kid) {
        throw new UnauthorizedError('Invalid Apple ID token', 'APPLE_TOKEN_INVALID');
    }

    const kid = decodedHeader.header.kid as string;
    const publicKey = certs[kid];
    if (!publicKey) {
        throw new UnauthorizedError('Apple token signing key not found', 'APPLE_KEY_NOT_FOUND');
    }

    let decoded: jwt.JwtPayload;
    try {
        decoded = jwt.verify(identityToken, publicKey, {
            algorithms: ['RS256'],
            audience: config.oauth.apple.clientId || undefined,
            issuer: 'https://appleid.apple.com',
        }) as jwt.JwtPayload;
    } catch {
        throw new UnauthorizedError('Apple ID token verification failed', 'APPLE_TOKEN_VERIFICATION_FAILED');
    }

    return mapAppleProfile(decoded as unknown as Record<string, unknown>);
};
