import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    user: Schema.Types.ObjectId;
    targetId: Schema.Types.ObjectId;
    targetType: 'user' | 'store';
    rating: number;
    feedback: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['user', 'store'],
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        feedback: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

reviewSchema.index({ targetId: 1, targetType: 1 });
reviewSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

export const ReviewModel = mongoose.model<IReview>('Review', reviewSchema, 'reviews');