import { UserModel } from '@/modules/user/user.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { CURRENCY } from '@/core/constants/currency';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const samplePayments = [
    { paymentType: 'subscription' as const, amount: 509, currency: CURRENCY, status: 'approved' as const, description: 'Monthly Premium Subscription' },
    { paymentType: 'boost' as const, amount: 309, currency: CURRENCY, status: 'approved' as const, description: 'Boost Product - iPhone 15 Pro' },
    { paymentType: 'ad' as const, amount: 1009, currency: CURRENCY, status: 'approved' as const, description: 'Premium Ad Campaign - Week 1' },
    { paymentType: 'listing' as const, amount: 109, currency: CURRENCY, status: 'approved' as const, description: 'Featured Listing - Luxury Watch' },
    { paymentType: 'story' as const, amount: 159, currency: CURRENCY, status: 'approved' as const, description: 'Story Promotion - Weekend Sale' },
    { paymentType: 'subscription' as const, amount: 509, currency: CURRENCY, status: 'pending' as const, description: 'Monthly Premium Subscription - Renewal' },
    { paymentType: 'boost' as const, amount: 19.99, currency: 'USD', status: 'rejected' as const, description: 'Boost Product - Vintage Chair' },
    { paymentType: 'ad' as const, amount: 199.99, currency: 'USD', status: 'approved' as const, description: 'Ultimate Ad Campaign - Month Package' },
    { paymentType: 'listing' as const, amount: 4.99, currency: 'USD', status: 'approved' as const, description: 'Featured Listing - Designer Bag' },
    { paymentType: 'subscription' as const, amount: 19.99, currency: 'USD', status: 'approved' as const, description: 'Basic Subscription Plan' },
    { paymentType: 'ad' as const, amount: 509, currency: CURRENCY, status: 'pending' as const, description: 'Standard Ad Campaign' },
    { paymentType: 'boost' as const, amount: 39.99, currency: 'USD', status: 'approved' as const, description: 'Boost Product - Gaming Laptop' },
    { paymentType: 'story' as const, amount: 109, currency: CURRENCY, status: 'approved' as const, description: 'Story Promotion - New Arrivals' },
    { paymentType: 'listing' as const, amount: 159, currency: CURRENCY, status: 'rejected' as const, description: 'Featured Listing - Electronics Bundle' },
    { paymentType: 'subscription' as const, amount: 1009, currency: CURRENCY, status: 'approved' as const, description: 'Annual Premium Subscription' },
    { paymentType: 'ad' as const, amount: 299.99, currency: 'USD', status: 'approved' as const, description: 'Enterprise Ad Campaign - Quarterly' },
    { paymentType: 'boost' as const, amount: 24.99, currency: 'USD', status: 'pending' as const, description: 'Boost Product - Camera Lens' },
    { paymentType: 'story' as const, amount: 19.99, currency: 'USD', status: 'approved' as const, description: 'Story Promotion - Flash Sale' },
    { paymentType: 'listing' as const, amount: 7.99, currency: 'USD', status: 'approved' as const, description: 'Featured Listing - Antique Vase' },
    { paymentType: 'subscription' as const, amount: 509, currency: CURRENCY, status: 'approved' as const, description: 'Monthly Premium Subscription - Gift' },
];

export const seedPayments = async (): Promise<void> => {
    await connectDatabase();

    try {
        const existingCount = await PaymentTransactionModel.countDocuments();
        if (existingCount > 0) {
            logger.info('Payments already exist, skipping', { existingCount });
            return;
        }

        const users = await UserModel.find().limit(5).lean();
        if (users.length === 0) {
            logger.error('No users found. Run seed:super-admin first.');
            return;
        }

        const payments = samplePayments.map((p, index) => {
            const user = users[index % users.length]!;
            return {
                user: user._id,
                email: user.email,
                paymentType: p.paymentType,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                description: p.description,
                createdAt: new Date(Date.now() - ((samplePayments.length - index) * 3 * 24 * 60 * 60 * 1000)),
            };
        });

        await PaymentTransactionModel.insertMany(payments);

        logger.info('Payment transactions seeded', { count: payments.length });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedPayments()
        .then(() => {
            logger.info('Payment seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Payment seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
