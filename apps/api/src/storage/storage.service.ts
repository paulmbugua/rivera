import { HttpStatus, Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { ApiException } from '../common/api-error';

export interface StorageProvider {
  upload(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

const formats: Record<string, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  'image/jpeg': { extension: 'jpg', signature: value => value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff },
  'image/png': { extension: 'png', signature: value => value.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  'image/webp': { extension: 'webp', signature: value => value.subarray(0, 4).toString() === 'RIFF' && value.subarray(8, 12).toString() === 'WEBP' },
};

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly root = resolve(process.env.LOCAL_UPLOAD_DIR ?? './uploads');
  private safe(key: string) { const target = resolve(this.root, key); if (!target.startsWith(this.root + sep)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSAFE_STORAGE_KEY', 'Unsafe media path.'); return target; }
  getPublicUrl(key: string) { return `${process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:4000/media'}/${key.split(sep).join('/')}`; }
  async upload(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const format = formats[file.mimetype];
    if (!format || !format.signature(file.buffer)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSUPPORTED_FILE_TYPE', 'Upload a valid JPEG, PNG or WEBP image.');
    const key = `${ownerId}/${purpose}/${randomUUID()}.${format.extension}`;
    const target = this.safe(key); await mkdir(resolve(target, '..'), { recursive: true }); await writeFile(target, file.buffer, { flag: 'wx' });
    return { key, url: this.getPublicUrl(key) };
  }
  async delete(key: string) { try { await unlink(this.safe(key)); } catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; } }
}
