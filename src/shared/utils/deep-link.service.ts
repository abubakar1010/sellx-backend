import { config } from '@config/index';

export class DeepLinkService {
    buildProductAppLink(productId: string): string {
        return `${config.deepLink.appScheme}://product/${productId}`;
    }

    buildProductShareUrl(productId: string): string {
        const baseUrl = config.app.clientUrl.replace(/\/$/, '');
        return `${baseUrl}/share/product/${productId}`;
    }

    getAppleAppSiteAssociation(): object {
        return {
            applinks: {
                apps: [],
                details: [
                    {
                        appID: `${config.deepLink.iosTeamId}.${config.deepLink.iosBundleId}`,
                        paths: ['/share/product/*'],
                    },
                ],
            },
        };
    }

    getAndroidAssetLinks(): object[] {
        return [
            {
                relation: ['delegate_permission/common.handle_all_urls'],
                target: {
                    namespace: 'android_app',
                    package_name: config.deepLink.androidPackageName,
                    sha256_cert_fingerprints: [config.deepLink.androidSha256Fingerprint],
                },
            },
        ];
    }

    detectPlatform(userAgent: string): 'ios' | 'android' | 'web' {
        if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
        if (/android/i.test(userAgent)) return 'android';
        return 'web';
    }

    getStoreUrl(platform: 'ios' | 'android' | 'web'): string {
        if (platform === 'ios' && config.deepLink.appStoreUrl) {
            return config.deepLink.appStoreUrl;
        }
        if (platform === 'android' && config.deepLink.playStoreUrl) {
            return config.deepLink.playStoreUrl;
        }
        return config.deepLink.webFallbackUrl || '/';
    }
}

export const deepLinkService = new DeepLinkService();
