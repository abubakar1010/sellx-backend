export const REPORT_REASONS = {
    SPAM_OR_MISLEADING: 'spam_or_misleading',
    SCAM_OR_FRAUD: 'scam_or_fraud',
    INAPPROPRIATE_CONTENT: 'inappropriate_content',
    WRONG_CATEGORY: 'wrong_category',
    DUPLICATE_LISTING: 'duplicate_listing',
    FAKE_SELLER: 'fake_seller',
    OTHER: 'other',
} as const;

export type ReportReason = (typeof REPORT_REASONS)[keyof typeof REPORT_REASONS];

export const BOOST_PLANS = [
    { name: 'Basic Boost', price: 29, durationHours: 24, description: 'Visibility for 24h' },
    { name: 'Standard Boost', price: 59, durationHours: 72, description: 'Visibility for 3 days' },
    { name: 'Premium Boost', price: 99, durationHours: 168, description: 'Visibility for 7 days' },
] as const;