import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import type { FileStorage } from './index';

const EXT_TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

export class LocalStorage implements FileStorage {
  private root = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_LOCAL_DIR || '.storage');

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async get(key: string) {
    try {
      const data = await fs.readFile(this.resolve(key));
      return { data, contentType: EXT_TYPES[path.extname(key)] || 'application/octet-stream' };
    } catch (e: any) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}
