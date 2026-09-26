import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreFollow extends Document {
    user: Schema.Types.ObjectId;
    store: Schema.Types.ObjectId;
    createdAt: Date;
}

const storeFollowSchema = new Schema<IStoreFollow>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

storeFollowSchema.index({ user: 1, store: 1 }, { unique: true });

export const StoreFollowModel = mongoose.model<IStoreFollow>('StoreFollow', storeFollowSchema, 'store_follows');