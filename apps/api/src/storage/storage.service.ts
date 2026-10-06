import { HttpStatus, Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { ApiException } from '../common/api-error';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StorageProvider {
  upload(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }): Promise<{ key: string; url: string }>;
  uploadPrivate(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }): Promise<{ key: string }>;
  read(key: string): Promise<Buffer>;
  deletePrivate(key: string): Promise<void>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

const formats: Record<string, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  'image/jpeg': { extension: 'jpg', signature: value => value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff },
  'image/png': { extension: 'png', signature: value => value.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  'image/webp': { extension: 'webp', signature: value => value.subarray(0, 4).toString() === 'RIFF' && value.subarray(8, 12).toString() === 'WEBP' },
};
const privateFormats: Record<string, { extension: string; signature: (buffer: Buffer) => boolean }> = {
  ...formats,
  'application/pdf': { extension: 'pdf', signature: value => value.subarray(0, 5).toString() === '%PDF-' },
  'video/mp4': { extension: 'mp4', signature: value => value.length > 12 && value.subarray(4, 8).toString() === 'ftyp' },
};

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly root = resolve(process.env.LOCAL_UPLOAD_DIR ?? './uploads');
  private readonly privateRoot = resolve(process.env.PRIVATE_UPLOAD_DIR ?? './private-uploads');
  private readonly useR2 = process.env.STORAGE_PROVIDER === 'r2';
  private readonly r2 = this.useR2 ? new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }) : null;
  private bucketFor(mimetype?: string) {
    return mimetype?.startsWith('video/')
      ? process.env.R2_BUCKET_VIDEOS!
      : process.env.R2_BUCKET_IMAGES!;
  }
  private storedKey(bucket: string, key: string) { return `r2:${bucket}:${key}`; }
  private parseStoredKey(value: string) {
    const match = /^r2:([^:]+):(.+)$/.exec(value);
    return match ? { bucket: match[1], key: match[2] } : null;
  }
  private safe(key: string) { const target = resolve(this.root, key); if (!target.startsWith(this.root + sep)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSAFE_STORAGE_KEY', 'Unsafe media path.'); return target; }
  private safePrivate(key: string) { const target = resolve(this.privateRoot, key); if (!target.startsWith(this.privateRoot + sep)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSAFE_STORAGE_KEY', 'Unsafe private media path.'); return target; }
  getPublicUrl(key: string) {
    const stored = this.parseStoredKey(key);
    if (stored) {
      const base = stored.bucket === process.env.R2_BUCKET_VIDEOS
        ? process.env.R2_PUBLIC_BASE_URL_VIDEOS
        : process.env.R2_PUBLIC_BASE_URL_IMAGES;
      return `${base?.replace(/\/$/, '')}/${stored.key}`;
    }
    return `${process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:4000/media'}/${key.split(sep).join('/')}`;
  }
  async upload(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const format = formats[file.mimetype];
    if (!format || !format.signature(file.buffer)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSUPPORTED_FILE_TYPE', 'Upload a valid JPEG, PNG or WEBP image.');
    const key = `${ownerId}/${purpose}/${randomUUID()}.${format.extension}`;
    if (this.r2) {
      const bucket = this.bucketFor(file.mimetype);
      await this.r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
      const stored = this.storedKey(bucket, key);
      return { key: stored, url: this.getPublicUrl(stored) };
    }
    const target = this.safe(key); await mkdir(resolve(target, '..'), { recursive: true }); await writeFile(target, file.buffer, { flag: 'wx' });
    return { key, url: this.getPublicUrl(key) };
  }
  async uploadPrivate(ownerId: string, purpose: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const format = privateFormats[file.mimetype];
    if (!format || !format.signature(file.buffer)) throw new ApiException(HttpStatus.BAD_REQUEST, 'UNSUPPORTED_DELIVERABLE_FILE', 'Upload a valid JPEG, PNG, WEBP, PDF or MP4 file.');
    const key = `${ownerId}/${purpose}/${randomUUID()}.${format.extension}`;
    if (this.r2) {
      const bucket = this.bucketFor(file.mimetype);
      await this.r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
      return { key: this.storedKey(bucket, key) };
    }
    const target = this.safePrivate(key); await mkdir(resolve(target, '..'), { recursive: true }); await writeFile(target, file.buffer, { flag: 'wx' });
    return { key };
  }
  async read(key: string) {
    const stored = this.parseStoredKey(key);
    if (stored && this.r2) {
      const result = await this.r2.send(new GetObjectCommand({ Bucket: stored.bucket, Key: stored.key }));
      if (!result.Body) throw new Error('R2 object body is empty');
      return Buffer.from(await result.Body.transformToByteArray());
    }
    return readFile(this.safePrivate(key));
  }
  async deletePrivate(key: string) {
    const stored = this.parseStoredKey(key);
    if (stored && this.r2) { await this.r2.send(new DeleteObjectCommand({ Bucket: stored.bucket, Key: stored.key })); return; }
    try { await unlink(this.safePrivate(key)); } catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
  async delete(key: string) {
    const stored = this.parseStoredKey(key);
    if (stored && this.r2) { await this.r2.send(new DeleteObjectCommand({ Bucket: stored.bucket, Key: stored.key })); return; }
    try { await unlink(this.safe(key)); } catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
}
