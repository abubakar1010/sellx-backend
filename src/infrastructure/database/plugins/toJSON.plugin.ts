import type { Schema } from 'mongoose';

export const toJSONPlugin = (schema: Schema): void => {
    const transform = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        if ('_id' in ret) {
            ret.id = String(ret._id);
            delete ret._id;
        }
        delete ret.__v;
        delete ret.password;
        return ret;
    };

    schema.set('toJSON', { transform: transform as never, virtuals: true });
    schema.set('toObject', { transform: transform as never, virtuals: true });
};
