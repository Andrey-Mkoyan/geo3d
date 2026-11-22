import 'server-only';
import { LocalStorage } from './local';
import { S3Storage } from './s3';

export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

let instance: FileStorage | null = null;

/** Driver is chosen by STORAGE_DRIVER=local|s3 */
export function getStorage(): FileStorage {
  if (!instance) {
    instance = process.env.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage();
  }
  return instance;
}
