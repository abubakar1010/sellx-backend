import { logger } from '../../logger/winston.logger';
import type { IEventBus } from '@/core/interfaces/event-bus.interface';
import { emailProducer } from '@/jobs/producers/email.producer';
import { config } from '@/config';

interface PasswordResetRequestedPayload {
    userId: string;
    email: string;
    fullName: string;
    code: string;
    expiresAt: Date;
}

interface OtpResendPayload {
    userId: string;
    email: string;
    fullName: string;
    otp: string;
    expiresAt: Date;
}

interface PasswordResetPayload {
    userId: string;
    email: string;
    fullName: string;
}

interface EmailVerifiedPayload {
    userId: string;
    email: string;
    fullName: string;
}

export const registerAuthListeners = (bus: IEventBus): void => {
    bus.on<PasswordResetRequestedPayload>('auth:password-reset-requested', async (payload) => {
        logger.info('Password reset requested event received', { ...payload });

        const expiresInMinutes = Math.floor((payload.expiresAt.getTime() - Date.now()) / 60000);

        await emailProducer.addJob('password-reset-email', {
            to: payload.email,
            subject: 'Your Password Reset Code',
            template: 'otp',
            context: {
                fullName: payload.fullName,
                otp: payload.code,
                expiresInMinutes,
            },
        });
    });

    bus.on<OtpResendPayload>('auth:otp-resend', async (payload) => {
        logger.info('OTP resend event received', { ...payload });

        const expiresInMinutes = Math.floor((payload.expiresAt.getTime() - Date.now()) / 60000);

        await emailProducer.addJob('otp-email', {
            to: payload.email,
            subject: 'Your verification code',
            template: 'otp',
            context: {
                fullName: payload.fullName,
                otp: payload.otp,
                expiresInMinutes,
            },
        });
    });

    bus.on<PasswordResetPayload>('auth:password-reset', async (payload) => {
        logger.info('Password reset event received', { ...payload });

        await emailProducer.addJob('password-reset-success-email', {
            to: payload.email,
            subject: 'Password Reset Successful',
            template: 'password-reset-success',
            context: {
                fullName: payload.fullName,
                loginUrl: `${config.app.clientUrl}/login`,
            },
        });
    });

    bus.on<EmailVerifiedPayload>('auth:email-verified', async (payload) => {
        logger.info('Email verified event received', { ...payload });

        await emailProducer.addJob('welcome-email', {
            to: payload.email,
            subject: 'Welcome to Our Platform!',
            template: 'welcome',
            context: {
                fullName: payload.fullName,
                email: payload.email,
            },
        });
    });
};