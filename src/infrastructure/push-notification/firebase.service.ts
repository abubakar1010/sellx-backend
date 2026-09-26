import admin from 'firebase-admin';
import path from 'node:path';
import { config } from '@/config';
import { logger } from '../logger/winston.logger';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App | null => {
    if (firebaseApp) {
        return firebaseApp;
    }

    if (!config.firebase.configPath) {
        logger.info('Firebase not configured — FIREBASE_CONFIG_PATH not set');
        return null;
    }

    try {
        const configPath = path.resolve(config.firebase.configPath);

        const serviceAccount = require(configPath);

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        logger.info('Firebase Admin SDK initialized', {
            projectId: serviceAccount.project_id,
        });

        return firebaseApp;
    } catch (error) {
        logger.error('Failed to initialize Firebase Admin SDK', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
};

export const getFirebaseApp = (): admin.app.App | null => {
    return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging | null => {
    if (!firebaseApp) {
        return null;
    }
    return admin.messaging();
};

export interface PushNotificationPayload {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

export const sendPushNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
    const messaging = getMessaging();
    if (!messaging) {
        logger.warn('Firebase messaging not available');
        return false;
    }

    try {
        const message: admin.messaging.Message = {
            token: payload.token,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const response = await messaging.send(message);
        logger.info('Push notification sent successfully', {
            messageId: response,
            token: payload.token.slice(0, 10) + '...',
        });
        return true;
    } catch (error) {
        const isInvalidToken =
            error instanceof Error &&
            (error.message.includes('messaging/invalid-registration-token') ||
                error.message.includes('messaging/registration-token-not-registered'));

        if (isInvalidToken) {
            logger.warn('Invalid FCM token — user should re-register', {
                token: payload.token.slice(0, 10) + '...',
            });
        } else {
            logger.error('Failed to send push notification', {
                error: error instanceof Error ? error.message : String(error),
                token: payload.token.slice(0, 10) + '...',
            });
        }
        return false;
    }
};

export const sendMulticastPushNotifications = async (
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
): Promise<{ successCount: number; failureCount: number }> => {
    const messaging = getMessaging();
    console.log('messaging', messaging);
    if (!messaging || tokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
    }

    try {
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title,
                body,
            },
            data,
        };
        console.log('message', message);

        const response = await messaging.sendEachForMulticast(message);
        console.log('Multicast push notifications sent', {
            successCount: response.successCount,
            failureCount: response.failureCount,
            totalTokens: tokens.length,
        });

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        console.error('Failed to send multicast push notifications', {
            error: error instanceof Error ? error.message : String(error),
        });
        return { successCount: 0, failureCount: tokens.length };
    }
};
