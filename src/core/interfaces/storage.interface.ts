export interface UploadResult {
    url: string;
    publicId: string;
}

export interface IStorageService {
    /**
     * Upload a file buffer to cloud storage.
     * @param buffer - File content
     * @param folder - Destination folder/path
     * @param filename - Optional custom filename
     */
    upload(buffer: Buffer, folder: string, filename?: string): Promise<UploadResult>;

    /**
     * Delete a file by its public ID / key.
     */
    delete(publicId: string): Promise<void>;
}
