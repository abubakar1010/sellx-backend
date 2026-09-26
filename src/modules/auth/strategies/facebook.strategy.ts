import { config } from '@/config';
import { BadRequestError } from '@/core/errors';

const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FACEBOOK_PROFILE_URL = 'https://graph.facebook.com/me';

const ensureFacebookOAuthConfigured = (): void => {
    if (
        !config.oauth.facebook.appId ||
        !config.oauth.facebook.appSecret ||
        !config.oauth.facebook.callbackUrl
    ) {
        throw new BadRequestError(
            'Facebook OAuth is not configured.',
            'FACEBOOK_OAUTH_NOT_CONFIGURED',
        );
    }
};

export interface FacebookAuthUrlOptions {
    state: string;
    scope?: string[];
}

export const getFacebookAuthUrl = (options: FacebookAuthUrlOptions): string => {
    ensureFacebookOAuthConfigured();

    const scope = options.scope ?? ['email', 'public_profile'];
    const params = new URLSearchParams({
        client_id: config.oauth.facebook.appId,
        redirect_uri: config.oauth.facebook.callbackUrl,
        response_type: 'code',
        scope: scope.join(','),
        state: options.state,
    });

    return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
};

export interface FacebookProfile {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
}

export const mapFacebookProfile = (raw: Record<string, unknown>): FacebookProfile => {
    const id = typeof raw.id === 'string' ? raw.id : '';
    const email = typeof raw.email === 'string' ? raw.email : '';
    const name = typeof raw.name === 'string' ? raw.name : '';

    let avatarUrl: string | undefined;
    const picture = raw.picture as { data?: { url?: unknown } } | undefined;
    if (picture?.data?.url && typeof picture.data.url === 'string') {
        avatarUrl = picture.data.url;
    }

    if (!id || !email) {
        throw new BadRequestError(
            'Facebook profile payload is incomplete.',
            'FACEBOOK_PROFILE_INVALID',
        );
    }

    return {
        id,
        email: email.toLowerCase(),
        name: name || email,
        avatarUrl,
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

export const exchangeFacebookCodeForProfile = async (
    code: string,
    signal?: AbortSignal,
): Promise<FacebookProfile> => {
    ensureFacebookOAuthConfigured();

    const { signal: requestSignal, cleanup } = resolveSignalWithTimeout(signal);
    try {
        const tokenParams = new URLSearchParams({
            client_id: config.oauth.facebook.appId,
            client_secret: config.oauth.facebook.appSecret,
            redirect_uri: config.oauth.facebook.callbackUrl,
            code,
        });

        const tokenResponse = await fetch(`${FACEBOOK_TOKEN_URL}?${tokenParams.toString()}`, {
            method: 'GET',
            signal: requestSignal,
        });
        if (!tokenResponse.ok) {
            throw new BadRequestError(
                'Facebook token exchange failed.',
                'FACEBOOK_TOKEN_EXCHANGE_FAILED',
            );
        }

        const tokenPayload = await parseJson<{ access_token?: string }>(tokenResponse);
        if (!tokenPayload.access_token) {
            throw new BadRequestError(
                'Facebook access token missing.',
                'FACEBOOK_TOKEN_EXCHANGE_FAILED',
            );
        }

        const profileParams = new URLSearchParams({
            fields: 'id,name,email,picture.type(large)',
            access_token: tokenPayload.access_token,
        });
        const profileResponse = await fetch(`${FACEBOOK_PROFILE_URL}?${profileParams.toString()}`, {
            method: 'GET',
            signal: requestSignal,
        });
        if (!profileResponse.ok) {
            throw new BadRequestError(
                'Facebook profile fetch failed.',
                'FACEBOOK_PROFILE_FETCH_FAILED',
            );
        }

        const profilePayload = await parseJson<Record<string, unknown>>(profileResponse);
        return mapFacebookProfile(profilePayload);
    } catch (error) {
        if (error instanceof BadRequestError) {
            throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
            throw new BadRequestError('Facebook request timed out.', 'FACEBOOK_REQUEST_TIMEOUT');
        }
        throw new BadRequestError('Facebook authentication failed.', 'FACEBOOK_AUTH_FAILED');
    } finally {
        cleanup();
    }
};
