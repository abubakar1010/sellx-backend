import { Document, Schema } from 'mongoose';

export interface IReviewDocument extends Document {
    user: Schema.Types.ObjectId;
    targetId: Schema.Types.ObjectId;
    targetType: 'user' | 'store';
    rating: number;
    feedback: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateReviewBody {
    targetId: string;
    targetType: 'user' | 'store';
    rating: number;
    feedback?: string;
}

export interface ReviewQuery {
    targetId: string;
    targetType: 'user' | 'store';
    page?: number;
    limit?: number;
}