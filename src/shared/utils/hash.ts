import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashValue = async (value: string): Promise<string> => {
    return bcrypt.hash(value, SALT_ROUNDS);
};

export const compareHash = async (value: string, hashedValue: string): Promise<boolean> => {
    return bcrypt.compare(value, hashedValue);
};
