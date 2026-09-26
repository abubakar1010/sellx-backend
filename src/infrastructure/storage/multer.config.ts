import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

/**
 * SVG is deliberately excluded: it is an HTML-hosting document, so an uploaded
 * SVG served from this origin executes script against it. No listing form needs one.
 */
export const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

/** Listings may carry supporting documents (e.g. a property valuation report). */
export const ALLOWED_DOCUMENT_TYPES = new Set(['application/pdf']);

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const getFileExtension = (mimetype: string): string => {
    const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
    };
    return mimeToExt[mimetype] || '.jpg';
};
const CHAT_UPLOAD_DIR = path.join(UPLOAD_DIR, 'chat');

export const saveSocketAttachment = (
    data: Buffer,
    mimeType: string,
    originalName: string,
): { url: string; filename: string } => {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    const ext = getFileExtension(mimeType);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(CHAT_UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, data);
    return { url: `/uploads/chat/${filename}`, filename };
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILES = 10;

export const multerUpload = multer({
    storage: multer.diskStorage({
        destination: (req, _file, cb) => {
            const subDir = (req as any).uploadDir || '';
            const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const ext = getFileExtension(file.mimetype);
            const filename = `${randomUUID()}${ext}`;
            cb(null, filename);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            callback(new Error('Unsupported file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
            return;
        }
        callback(null, true);
    },
});

export const MAX_DOCUMENTS = 5;

/**
 * Listing uploads: up to ten images plus up to five PDF documents, on separate
 * fields. The filter branches on the field name so a PDF cannot be posted as an
 * image, or vice versa.
 */
export const productUpload = multer({
    storage: multer.diskStorage({
        destination: (req, _file, cb) => {
            const subDir = (req as any).uploadDir || '';
            const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            cb(null, `${randomUUID()}${getFileExtension(file.mimetype)}`);
        },
    }),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES + MAX_DOCUMENTS,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        const allowed =
            file.fieldname === 'documents' ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES;

        if (!allowed.has(file.mimetype)) {
            callback(
                new Error(
                    file.fieldname === 'documents'
                        ? 'Unsupported file type. Only PDF documents are allowed.'
                        : 'Unsupported file type. Only JPEG, PNG, WebP, and GIF are allowed.',
                ),
            );
            return;
        }

        callback(null, true);
    },
}).fields([
    { name: 'images', maxCount: MAX_FILES },
    { name: 'documents', maxCount: MAX_DOCUMENTS },
]);

export const productImageUpload = multerUpload.array('images', 10);
export const uploadSingleImage = multerUpload.single('image');