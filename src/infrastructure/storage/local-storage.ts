import path from 'node:path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const getFileUrl = (filename: string, subDir?: string): string => {
    return subDir ? `/uploads/${subDir}/${filename}` : `/uploads/${filename}`;
};

export const getFilePath = (filename: string, subDir?: string): string => {
    return subDir ? path.join(UPLOAD_DIR, subDir, filename) : path.join(UPLOAD_DIR, filename);
};

export const UPLOAD_DIRECTORY = UPLOAD_DIR;