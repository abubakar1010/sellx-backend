declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                status: string;
                registrationStrategy?: string;
            };
            requestId?: string;
            /** Set by `resolveCategoryContext`; selects the listing schema to validate against. */
            categorySlug?: string;
            abortController?: AbortController;
            signal?: AbortSignal;
        }
    }
}

export {};
