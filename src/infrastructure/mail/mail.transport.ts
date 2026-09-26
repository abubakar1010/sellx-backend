import nodemailer, { type Transporter } from 'nodemailer';

import { config } from '@/config';

export const mailTransporter: Transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user && config.mail.pass
        ? {
              user: config.mail.user,
              pass: config.mail.pass,
          }
        : undefined,
    debug: config.isDevelopment, // Enable debug output in development
    logger: config.isDevelopment, // Enable logging in development
});

export const verifyMailTransport = async (): Promise<void> => {
    if (config.isTest) {
        return;
    }
    await mailTransporter.verify();
};
