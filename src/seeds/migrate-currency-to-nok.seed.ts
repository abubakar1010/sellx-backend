import type { Model } from 'mongoose';

import { CURRENCY } from '@/core/constants/currency';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { SubscriptionModel } from '@/modules/subscriptions/subscription.model';
import { ListingPackageModel } from '@/modules/listing-package/listing-package.model';
import { StoryPackageModel } from '@/modules/stories/story.model';
import { BoostPlanModel, Product } from '@/modules/products/products.model';
import { AdCampaignModel, AdPackageModel } from '@/modules/ads/ads.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { ListingPurchaseModel } from '@/modules/listing-purchase/listing-purchase.model';
import { StoryPurchaseModel } from '@/modules/story-purchase/story-purchase.model';
import { UserSubscriptionModel } from '@/modules/user-subscription/user-subscription.model';

/** Agreed USD -> NOK rate for this one-off migration. */
const RATE = 10;

/**
 * Converts a USD amount to NOK and rounds **up to the next value ending in 9**
 * (charm pricing): 49.99 -> 509, 14.99 -> 159, 2 -> 29. Free stays free.
 */
export const usdToNok = (usd: number): number => {
    if (!usd || usd <= 0) return 0;
    return Math.ceil((usd * RATE - 9) / 10) * 10 + 9;
};

/** Rows already at NOK are skipped, which is what makes re-runs safe. */
const NOT_NOK = { currency: { $ne: CURRENCY } };

/** Raw shape of a lean document; every target has a different schema. */
type LeanDoc = Record<string, unknown>;

const numberField = (doc: LeanDoc, field: string): number => {
    const value = doc[field];
    return typeof value === 'number' ? value : 0;
};

interface Target {
    label: string;
    // The target list is deliberately heterogeneous — one entry per collection.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: Model<any>;
    /** Amount field to convert. Omit to only stamp the currency. */
    amountField?: string;
    /** Embedded snapshot whose price/currency must move in lockstep. */
    snapshot?: string;
}

const TARGETS: Target[] = [
    { label: 'subscriptions', model: SubscriptionModel, amountField: 'price' },
    { label: 'listing-packages', model: ListingPackageModel, amountField: 'price' },
    { label: 'story-packages', model: StoryPackageModel, amountField: 'price' },
    { label: 'boost-plans', model: BoostPlanModel, amountField: 'price' },
    { label: 'ad-packages', model: AdPackageModel, amountField: 'price' },
    { label: 'ad-campaigns', model: AdCampaignModel, amountField: 'price' },
    { label: 'payments', model: PaymentTransactionModel, amountField: 'amount' },
    {
        label: 'listing-purchases',
        model: ListingPurchaseModel,
        amountField: 'price',
        snapshot: 'packageSnapshot',
    },
    {
        label: 'story-purchases',
        model: StoryPurchaseModel,
        amountField: 'price',
        snapshot: 'packageSnapshot',
    },
    {
        label: 'user-subscriptions',
        model: UserSubscriptionModel,
        amountField: 'price',
        snapshot: 'planSnapshot',
    },
    // Products are intentionally NOT converted: listings already defaulted to NOK,
    // so their prices are seller-entered kroner. Only stamp the currency.
    { label: 'products (currency only)', model: Product },
];

export const migrateCurrencyToNok = async (dryRun = false): Promise<void> => {
    await connectDatabase();

    try {
        for (const target of TARGETS) {
            const docs = await target.model.find(NOT_NOK).lean();

            if (!docs.length) {
                logger.info(`— ${target.label}: nothing to migrate`);
                continue;
            }

            for (const raw of docs) {
                const doc = raw as LeanDoc;
                const update: Record<string, unknown> = { currency: CURRENCY };

                if (target.amountField) {
                    update[target.amountField] = usdToNok(numberField(doc, target.amountField));
                }

                if (target.snapshot) {
                    const snap = doc[target.snapshot] as LeanDoc | undefined;
                    if (snap) {
                        update[`${target.snapshot}.price`] = usdToNok(numberField(snap, 'price'));
                        update[`${target.snapshot}.currency`] = CURRENCY;
                    }
                }

                const previousCurrency = (doc.currency as string | undefined) ?? '(none)';

                logger.info(`  ${target.label} ${String(doc._id)}`, {
                    from: target.amountField
                        ? `${numberField(doc, target.amountField)} ${previousCurrency}`
                        : previousCurrency,
                    to: target.amountField
                        ? `${update[target.amountField]} ${CURRENCY}`
                        : CURRENCY,
                });

                if (!dryRun) {
                    await target.model.updateOne({ _id: doc._id }, { $set: update });
                }
            }

            logger.info(
                `${dryRun ? '(dry-run) ' : ''}✅ ${target.label}: ${docs.length} record(s) migrated`,
            );
        }
    } finally {
        await disconnectDatabase();
    }
};

// CLI execution
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) logger.info('Running in --dry-run mode: no writes will be made.');

    void migrateCurrencyToNok(dryRun)
        .then(() => {
            logger.info(`🎉 Currency migration to ${CURRENCY} finished successfully.`);
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Currency migration failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
