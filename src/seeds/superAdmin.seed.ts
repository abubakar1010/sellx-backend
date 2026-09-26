import { config } from '@/config';
import { ROLES } from '@/core/constants/roles';
import { UserModel } from '@/modules/user/user.model';
import { AUTH_STRATEGIES, USER_STATUS } from '@/modules/user/user.constants';
import { ONBOARDING_STEPS as OnboardingStepsEnum } from '@/modules/user/user.interface';
import { compareHash, hashValue } from '@/shared/utils/hash';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

// Defaults
const DEFAULT_SUPER_ADMIN_EMAIL = 'sellx@admin.com';
const DEFAULT_SUPER_ADMIN_FIRST_NAME = 'Super';
const DEFAULT_SUPER_ADMIN_LAST_NAME = 'Admin';
const DEFAULT_SUPER_ADMIN_PASSWORD = '1qazxsW@';

interface SeedConfig {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password: string;
}

const getSeedConfig = (): SeedConfig => {
    const email = (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL).trim().toLowerCase();

    // Support both split names and legacy combined name
    const firstName =
        process.env.SUPER_ADMIN_FIRST_NAME?.trim() ??
        process.env.SUPER_ADMIN_NAME?.split(' ')[0]?.trim() ??
        DEFAULT_SUPER_ADMIN_FIRST_NAME;

    const lastName =
        process.env.SUPER_ADMIN_LAST_NAME?.trim() ??
        process.env.SUPER_ADMIN_NAME?.split(' ').slice(1).join(' ')?.trim() ??
        DEFAULT_SUPER_ADMIN_LAST_NAME;

    const phone = process.env.SUPER_ADMIN_PHONE?.trim() || undefined;
    const password = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;

    return { email, firstName, lastName, phone, password };
};

export const seedSuperAdmin = async (): Promise<void> => {
    const seedConfig = getSeedConfig();

    // Production safety checks
    if (config.isProduction) {
        if (!process.env.SUPER_ADMIN_PASSWORD) {
            throw new Error('SUPER_ADMIN_PASSWORD is required in production');
        }
    }

    await connectDatabase();

    try {
        const existing = await UserModel.findOne({ email: seedConfig.email }).select('+password');
        const hashedPassword = await hashValue(seedConfig.password);

        const baseData = {
            firstName: seedConfig.firstName,
            lastName: seedConfig.lastName,
            email: seedConfig.email,
            ...(seedConfig.phone && { phone: seedConfig.phone }),
            password: hashedPassword,
            role: ROLES.SUPER_ADMIN,
            status: USER_STATUS.ACTIVE,
            registrationStrategy: AUTH_STRATEGIES.LOCAL,
            isEmailVerified: true,
            isDeleted: false,
            deletedAt: null,
            agreeTermsAndConditions: true,
            termsAcceptedAt: new Date(),
            onboardingStep: OnboardingStepsEnum.COMPLETED,
            isOnboardingCompleted: true,
            failedLoginAttempts: 0,
            lockUntil: null,
        };

        if (!existing) {
            await UserModel.create(baseData);
            logger.info('✅ Super admin user created.', {
                email: seedConfig.email,
                name: `${seedConfig.firstName} ${seedConfig.lastName}`,
            });
            return;
        }

        // Check if password needs update
        const shouldUpdatePassword = existing.password
            ? !(await compareHash(seedConfig.password, existing.password))
            : true;

        // Update existing admin
        existing.firstName = seedConfig.firstName;
        existing.lastName = seedConfig.lastName;
        if (seedConfig.phone) existing.phone = seedConfig.phone;
        existing.role = ROLES.SUPER_ADMIN;
        existing.status = USER_STATUS.ACTIVE;
        existing.registrationStrategy = AUTH_STRATEGIES.LOCAL;
        existing.isEmailVerified = true;
        existing.isDeleted = false;
        existing.deletedAt = null;
        existing.agreeTermsAndConditions = true;
        existing.termsAcceptedAt = existing.termsAcceptedAt ?? new Date();
        existing.onboardingStep = OnboardingStepsEnum.COMPLETED;
        existing.isOnboardingCompleted = true;
        existing.failedLoginAttempts = 0;
        existing.lockUntil = null;

        if (shouldUpdatePassword) {
            existing.password = hashedPassword;
        }

        await existing.save();

        logger.info('✅ Super admin user normalized.', {
            email: seedConfig.email,
            name: `${seedConfig.firstName} ${seedConfig.lastName}`,
            passwordUpdated: shouldUpdatePassword,
        });
    } finally {
        await disconnectDatabase();
    }
};;

// CLI execution
if (require.main === module) {
    void seedSuperAdmin()
        .then(() => {
            logger.info('🎉 Super admin seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Super admin seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
