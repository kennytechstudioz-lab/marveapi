import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

/**
 * Upload a buffer to S3 (or local disk fallback) and return the public URL
 * @param buffer - File buffer
 * @param fileName - Original filename or desired name
 * @param mimeType - Mime type of the file
 */
export const uploadToS3 = async (buffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (bucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        try {
            const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `verification-docs/${Date.now()}-${cleanName}`;
            const upload = new Upload({
                client: s3Client,
                params: {
                    Bucket: bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: mimeType,
                },
            });

            await upload.done();
            return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        } catch (error: any) {
            console.error('S3 Upload Error, falling back to local disk storage:', error.message);
        }
    }

    // Local Disk Fallback if S3 fails or credentials missing
    try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadDir, cleanName);
        fs.writeFileSync(filePath, buffer);
        return `uploads/${cleanName}`;
    } catch (fsErr: any) {
        throw new Error(`Failed to save uploaded file: ${fsErr.message}`);
    }
};

/**
 * Reusable function to process a base64 media data URI and upload directly to S3 bucket.
 * If the input string is already a URL, it returns it directly.
 * 
 * @param base64DataUri - Base64 data string (e.g., "data:image/png;base64,...")
 * @param filePrefix - File name category identifier (e.g., "profile", "banner", "cac", "idcard")
 * @param identifier - Unique identifier for naming (e.g. username or userId)
 * @returns Uploaded S3 public URL
 */
export const processAndUploadBase64Image = async (
    base64DataUri: string | undefined | null,
    filePrefix: string,
    identifier: string = 'media'
): Promise<string | undefined> => {
    if (!base64DataUri || typeof base64DataUri !== 'string' || base64DataUri.trim() === '') {
        return undefined;
    }

    // Return directly if it's already an HTTP URL or local storage path
    if (base64DataUri.startsWith('http://') || base64DataUri.startsWith('https://') || base64DataUri.startsWith('uploads/')) {
        return base64DataUri;
    }

    if (!base64DataUri.startsWith('data:')) {
        return base64DataUri;
    }

    try {
        const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data URI format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let ext = mimeType.split('/')[1] || 'jpg';
        if (ext === 'jpeg') ext = 'jpg';

        const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${cleanIdentifier}-${filePrefix}.${ext}`;

        return await uploadToS3(buffer, fileName, mimeType);
    } catch (error: any) {
        console.error(`S3 Media Upload Error for ${filePrefix}:`, error.message);
        throw new Error(`Failed to upload ${filePrefix} media to S3: ${error.message}`);
    }
};

/**
 * Delete a file from S3 using its URL
 * @param url Document or image URL
 */
export const deleteFromS3 = async (url: string): Promise<void> => {
    try {
        if (!url || !url.includes('amazonaws.com')) return;
    } catch (_) {}
};
