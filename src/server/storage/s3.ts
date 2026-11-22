import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { FileStorage } from './index';

/** S3-compatible storage: AWS S3, Cloudflare R2, MinIO. The bucket must be PRIVATE. */
export class S3Storage implements FileStorage {
  private client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }
      : undefined,
  });
  private bucket = process.env.S3_BUCKET!;

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
