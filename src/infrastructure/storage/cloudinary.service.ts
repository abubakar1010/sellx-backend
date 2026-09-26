import { v2 as cloudinary } from 'cloudinary';
import { config } from '@/config';
import type { IStorageService, UploadResult } from '@/core/interfaces/storage.interface';

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

export class CloudinaryService implements IStorageService {
    async upload(buffer: Buffer, folder: string, filename?: string): Promise<UploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: filename,
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) return reject(new Error(error?.message ?? String(error)));
                    if (!result) return reject(new Error('Upload failed'));
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                },
            );
            uploadStream.end(buffer);
        });
    }

    async delete(publicId: string): Promise<void> {
        await cloudinary.uploader.destroy(publicId);
    }
}

export const cloudinaryService = new CloudinaryService();