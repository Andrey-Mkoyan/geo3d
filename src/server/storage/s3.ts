import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { FileStorage } from './index';

/**
 * S3-compatible storage (Neon Object Storage, AWS S3, R2, MinIO). The bucket must be PRIVATE.
 * Connection settings come from the standard AWS_* env vars, which the SDK reads itself:
 * AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
 */
export class S3Storage implements FileStorage {
  private client = new S3Client({ forcePathStyle: true });
  private bucket = process.env.S3_BUCKET || 'assets';

  async put(key: string, data: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }

  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await res.Body!.transformToByteArray();
      return { data: Buffer.from(bytes), contentType: res.ContentType || 'application/octet-stream' };
    } catch (e: any) {
      if (e.name === 'NoSuchKey') return null;
      throw e;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
