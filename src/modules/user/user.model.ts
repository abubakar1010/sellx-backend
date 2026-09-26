import mongoose, { Schema } from 'mongoose';

import { IUserRatingDistribution, ONBOARDING_STEPS, type IUserDocument } from './user.interface';
import { ALL_ROLES, ROLES } from '@/core/constants/roles';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { AUTH_STRATEGIES, USER_DEFAULTS, USER_STATUS } from './user.constants';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

const userSchema = new Schema<IUserDocument>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        password: {
            type: String,
            required: true,
            select: false,
            minlength: 8,
        },
        role: {
            type: String,
            enum: ALL_ROLES,
            default: ROLES.USER,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_DEFAULTS.STATUS,
            index: true,
        },
        registrationStrategy: {
            type: String,
            enum: Object.values(AUTH_STRATEGIES),
            default: USER_DEFAULTS.REGISTRATION_STRATEGY,
            index: true,
        },
        lastLoginStrategy: {
            type: String,
            enum: Object.values(AUTH_STRATEGIES),
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: USER_DEFAULTS.IS_DELETED,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        avatarUrl: {
            type: String,
            trim: true,
        },
        lastLoginAt: {
            type: Date,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
        address: {
            type: String,
            trim: true,
            default: null,
        },
        totalProducts: {
            type: Number,
            default: 0,
            min: 0,
        },
        avgRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
            index: true,
        },
        totalReviewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Percentage distribution for each rating (5 stars, 4 stars, etc.)
        ratingDistribution: {
            type: {
                5: { type: Number, default: 0, min: 0, max: 100 },
                4: { type: Number, default: 0, min: 0, max: 100 },
                3: { type: Number, default: 0, min: 0, max: 100 },
                2: { type: Number, default: 0, min: 0, max: 100 },
                1: { type: Number, default: 0, min: 0, max: 100 },
            },
            default: {
                5: 0,
                4: 0,
                3: 0,
                2: 0,
                1: 0,
            },
            _id: false,
        },
        soldItemsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        notificationToken: {
            type: String,
            trim: true,
        },
        deviceType: {
            type: String,
            enum: ['ios', 'android', 'web'],
        },
        activeProfileType: {
            type: String,
            enum: ['user', 'store'],
            default: 'user',
        },
        activeStoreId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            default: null,
        },
        lockUntil: {
            type: Date,
        },
        // inside Schema definition:
        onboardingStep: {
            type: String,
            enum: Object.values(ONBOARDING_STEPS),
            default: ONBOARDING_STEPS.REGISTERED,
            index: true,
        },
        isOnboardingCompleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        agreeTermsAndConditions: {
            type: Boolean,
            required: true,
            default: false,
        },
        termsAcceptedAt: {
            type: Date,
        },
        interestedCategories: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Category',
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

// Validate that percentages add up to ~100% (skip for new documents)
userSchema
    .path('ratingDistribution')
    .validate(function (this: IUserDocument, dist: IUserRatingDistribution | null | undefined) {
        if (this.isNew) return true; // Skip validation for new users
        if (!dist) return true;
        const sum = Object.values(dist).reduce((acc: number, val: number) => acc + (val || 0), 0);
        return Math.abs(sum - 100) <= 2;
    }, 'Rating distribution percentages must add up to approximately 100%');

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > new Date());
});

// Virtual to return distribution in a more readable format
userSchema.virtual('ratingDistributionFormatted').get(function () {
    if (!this.ratingDistribution) return {};
    return {
        five: this.ratingDistribution[5] || 0,
        four: this.ratingDistribution[4] || 0,
        three: this.ratingDistribution[3] || 0,
        two: this.ratingDistribution[2] || 0,
        one: this.ratingDistribution[1] || 0,
    };
});

// Plugins
userSchema.plugin(toJSONPlugin);
userSchema.plugin(paginatePlugin);

// Indexes
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });

// Text index for search
userSchema.index({
    firstName: 'text',
    lastName: 'text',
    email: 'text',
});

export const UserModel = mongoose.model<IUserDocument, PaginateModel<IUserDocument>>(
    'User',
    userSchema,
    'users',
);
