import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface AttendanceEvidenceStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

function assertSafeKey(key: string) {
  if (!key || key.startsWith('/') || key.split('/').some((part) => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_-]+$/.test(part))) {
    throw new Error('Invalid attendance evidence storage key');
  }
}

export class LocalAttendanceEvidenceStorage implements AttendanceEvidenceStorage {
  private readonly root: string;

  constructor(root = process.env.ATTENDANCE_EVIDENCE_LOCAL_DIR || path.join(process.cwd(), '.local', 'attendance-evidence')) {
    this.root = path.resolve(root);
  }

  private filePath(key: string) {
    assertSafeKey(key);
    const file = path.resolve(this.root, ...key.split('/'));
    if (!file.startsWith(`${this.root}${path.sep}`)) throw new Error('Invalid attendance evidence storage key');
    return file;
  }

  async put(key: string, bytes: Uint8Array) {
    const file = this.filePath(key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, bytes, { mode: 0o600 });
  }

  async get(key: string) {
    try { return new Uint8Array(await readFile(this.filePath(key))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string) {
    await rm(this.filePath(key), { force: true });
  }
}

export class R2AttendanceEvidenceStorage implements AttendanceEvidenceStorage {
  constructor(private readonly client: Pick<S3Client, 'send'>, private readonly bucket: string) {
    if (!bucket) throw new Error('Attendance evidence bucket is not configured');
  }

  async put(key: string, bytes: Uint8Array, contentType: string) {
    assertSafeKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }));
  }

  async get(key: string) {
    assertSafeKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return result.Body ? new Uint8Array(await result.Body.transformToByteArray()) : null;
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async delete(key: string) {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let cachedStorage: AttendanceEvidenceStorage | undefined;

export function getAttendanceEvidenceStorage(): AttendanceEvidenceStorage {
  if (cachedStorage) return cachedStorage;
  const provider = process.env.ATTENDANCE_EVIDENCE_STORAGE || 'local';
  if (provider === 'local') return cachedStorage = new LocalAttendanceEvidenceStorage();
  if (provider !== 'r2') throw new Error('Unsupported attendance evidence storage provider');
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('Cloudflare R2 attendance evidence configuration is incomplete');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedStorage = new R2AttendanceEvidenceStorage(client, bucket);
}