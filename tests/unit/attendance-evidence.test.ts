import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { LocalAttendanceEvidenceStorage, R2AttendanceEvidenceStorage } from '@/features/attendance/server/evidence-storage';
import { EvidenceValidationError, MAX_ATTENDANCE_EVIDENCE_BYTES, validateAttendanceEvidence } from '@/features/attendance/server/evidence-validation';

function png(width = 320, height = 240) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe('attendance screenshot evidence', () => {
  it('validates image signature, dimensions, size, and digest', () => {
    const validated = validateAttendanceEvidence(png(), 'image/png');
    expect(validated.contentType).toBe('image/png');
    expect(validated.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => validateAttendanceEvidence(png(), 'image/jpeg')).toThrow(EvidenceValidationError);
    expect(() => validateAttendanceEvidence(png(4097, 1), 'image/png')).toThrow(/dimensions/);
    expect(() => validateAttendanceEvidence(new Uint8Array(MAX_ATTENDANCE_EVIDENCE_BYTES + 1), 'image/png')).toThrow(/5 MB/);
  });

  it('stores and removes files in the local adapter without exposing paths', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'attendance-evidence-'));
    const storage = new LocalAttendanceEvidenceStorage(root);
    const bytes = png();
    try {
      await storage.put('sessions/session_1/evidence_1', bytes);
      expect(await storage.get('sessions/session_1/evidence_1')).toEqual(bytes);
      await expect(storage.put('../escape', bytes)).rejects.toThrow(/Invalid/);
      await storage.delete('sessions/session_1/evidence_1');
      expect(await storage.get('sessions/session_1/evidence_1')).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses the R2 S3-compatible adapter without needing credentials in tests', async () => {
    let object = new Uint8Array();
    const send = vi.fn(async (command: { constructor: { name: string }; input: { Body?: Uint8Array } }) => {
      if (command.constructor.name === 'PutObjectCommand') object = new Uint8Array(command.input.Body!);
      if (command.constructor.name === 'GetObjectCommand') return { Body: { transformToByteArray: async () => object } };
      return {};
    });
    const storage = new R2AttendanceEvidenceStorage({ send } as never, 'private-test-bucket');
    const bytes = png();
    await storage.put('sessions/session_1/evidence_1', bytes, 'image/png');
    expect(await storage.get('sessions/session_1/evidence_1')).toEqual(bytes);
    await storage.delete('sessions/session_1/evidence_1');
    expect(send).toHaveBeenCalledTimes(3);
  });
});
