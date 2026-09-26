import { config } from '@/config';
import { BadRequestError, UnauthorizedError } from '@/core/errors';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';

let googleCerts: Record<string, string> | null = null;
let googleCertsFetchedAt = 0;
const GOOGLE_CERTS_CACHE_MS = 60 * 60 * 1000;

const getGoogleCerts = async (signal?: AbortSignal): Promise<Record<string, string>> => {
    const now = Date.now();
    if (googleCerts && now - googleCertsFetchedAt < GOOGLE_CERTS_CACHE_MS) {
        return googleCerts;
    }

    const response = await fetch(GOOGLE_CERTS_URL, { signal });
    if (!response.ok) {
        throw new UnauthorizedError('Failed to fetch Google verification keys', 'GOOGLE_CERTS_FETCH_FAILED');
    }

    const data = (await response.json()) as Record<string, unknown>;
    googleCerts = data as Record<string, string>;
    googleCertsFetchedAt = now;
    return googleCerts;
};

const ensureGoogleOAuthConfigured = (): void => {
    if (
        !config.oauth.google.clientId ||
        !config.oauth.google.clientSecret ||
        !config.oauth.google.callbackUrl
    ) {
        throw new BadRequestError('Google OAuth is not configured.', 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }
};

export interface GoogleAuthUrlOptions {
    state: string;
    scope?: string[];
    prompt?: 'none' | 'consent' | 'select_account';
}

export const getGoogleAuthUrl = (options: GoogleAuthUrlOptions): string => {
    ensureGoogleOAuthConfigured();

    const scope = options.scope ?? ['openid', 'email', 'profile'];
    const params = new URLSearchParams({
        client_id: config.oauth.google.clientId,
        redirect_uri: config.oauth.google.callbackUrl,
        response_type: 'code',
        scope: scope.join(' '),
        access_type: 'offline',
        prompt: options.prompt ?? 'consent',
        state: options.state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

export interface GoogleProfile {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    emailVerified: boolean;
}

export const mapGoogleProfile = (raw: Record<string, unknown>): GoogleProfile => {
    const id = typeof raw.sub === 'string' ? raw.sub : '';
    const email = typeof raw.email === 'string' ? raw.email : '';
    const name = typeof raw.name === 'string' ? raw.name : '';
    const avatarUrl = typeof raw.picture === 'string' ? raw.picture : undefined;
    const emailVerified = raw.email_verified === true;

    if (!id || !email) {
        throw new BadRequestError(
            'Google profile payload is incomplete.',
            'GOOGLE_PROFILE_INVALID',
        );
    }

    return {
        id,
        email: email.toLowerCase(),
        name: name || email,
        avatarUrl,
        emailVerified,
    };
};

const resolveSignalWithTimeout = (
    signal?: AbortSignal,
    timeoutMs = config.app.requestTimeoutMs,
): { signal: AbortSignal; cleanup: () => void } => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
        if (signal.aborted) {
            controller.abort();
        } else {
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
    }

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeout),
    };
};

const parseJson = async <T>(response: Response): Promise<T> => {
    const payload = (await response.json()) as T;
    return payload;
};

export const exchangeGoogleCodeForProfile = async (
    code: string,
    signal?: AbortSignal,
): Promise<GoogleProfile> => {
    ensureGoogleOAuthConfigured();

    const { signal: requestSignal, cleanup } = resolveSignalWithTimeout(signal);
    try {
        const tokenBody = new URLSearchParams({
            code,
            client_id: config.oauth.google.clientId,
            client_secret: config.oauth.google.clientSecret,
            redirect_uri: config.oauth.google.callbackUrl,
            grant_type: 'authorization_code',
        });

        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: tokenBody.toString(),
            signal: requestSignal,
        });

        if (!tokenResponse.ok) {
            throw new BadRequestError(
                'Google token exchange failed.',
                'GOOGLE_TOKEN_EXCHANGE_FAILED',
            );
        }

        const tokenPayload = await parseJson<{ access_token?: string }>(tokenResponse);
        if (!tokenPayload.access_token) {
            throw new BadRequestError(
                'Google access token missing.',
                'GOOGLE_TOKEN_EXCHANGE_FAILED',
            );
        }

        const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokenPayload.access_token}`,
            },
            signal: requestSignal,
        });

        if (!profileResponse.ok) {
            throw new BadRequestError(
                'Google profile fetch failed.',
                'GOOGLE_PROFILE_FETCH_FAILED',
            );
        }

        const profilePayload = await parseJson<Record<string, unknown>>(profileResponse);
        return mapGoogleProfile(profilePayload);
    } catch (error) {
        if (error instanceof BadRequestError) {
            throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
            throw new BadRequestError('Google request timed out.', 'GOOGLE_REQUEST_TIMEOUT');
        }
        throw new BadRequestError('Google authentication failed.', 'GOOGLE_AUTH_FAILED');
    } finally {
        cleanup();
    }
};

export const verifyGoogleIdToken = async (
    idToken: string,
    signal?: AbortSignal,
): Promise<GoogleProfile> => {
    console.log(config.oauth.google);
    if (!config.oauth.google.clientId) {
        throw new BadRequestError(
            'Google OAuth Client ID is not configured.',
            'GOOGLE_OAUTH_NOT_CONFIGURED',
        );
    }

    const certs = await getGoogleCerts(signal);

    const decodedHeader = jwt.decode(idToken, { complete: true });
    if (!decodedHeader || typeof decodedHeader.header !== 'object' || !decodedHeader.header.kid) {
        throw new UnauthorizedError('Invalid Google ID token', 'GOOGLE_TOKEN_INVALID');
    }

    const kid = decodedHeader.header.kid as string;
    const publicKey = certs[kid];
    if (!publicKey) {
        throw new UnauthorizedError('Google token signing key not found', 'GOOGLE_KEY_NOT_FOUND');
    }

    let decoded: jwt.JwtPayload;
    try {
        decoded = jwt.verify(idToken, publicKey, {
            algorithms: ['RS256'],
            audience: config.oauth.google.clientId,
            issuer: ['accounts.google.com', 'https://accounts.google.com'],
        }) as jwt.JwtPayload;
    } catch {
        throw new UnauthorizedError('Google ID token verification failed', 'GOOGLE_TOKEN_VERIFICATION_FAILED');
    }

    return mapGoogleProfile(decoded as unknown as Record<string, unknown>);
};
