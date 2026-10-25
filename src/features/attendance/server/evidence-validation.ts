import { createHash } from 'node:crypto';

export const MAX_ATTENDANCE_EVIDENCE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const MAX_PIXELS = 16_777_216;

export class EvidenceValidationError extends Error {}

function dimensions(bytes: Uint8Array, type: string): { width: number; height: number } | null {
  if (type === 'image/png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === 'image/jpeg') {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
      }
      offset += length;
    }
    return null;
  }
  if (type === 'image/webp' && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (chunk === 'VP8X') return { width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16), height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16) };
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const b1 = bytes[21], b2 = bytes[22], b3 = bytes[23], b4 = bytes[24];
      return { width: 1 + b1 + ((b2 & 0x3f) << 8), height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) };
    }
  }
  return null;
}

function detectedType(bytes: Uint8Array): string | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 16 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export function validateAttendanceEvidence(bytes: Uint8Array, declaredType: string) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_ATTENDANCE_EVIDENCE_BYTES) throw new EvidenceValidationError('Screenshot must be between 1 byte and 5 MB.');
  const contentType = detectedType(bytes);
  if (!contentType || contentType !== declaredType) throw new EvidenceValidationError('Screenshot content does not match an allowed PNG, JPEG, or WebP image.');
  const size = dimensions(bytes, contentType);
  if (!size || size.width < 1 || size.height < 1 || size.width > MAX_DIMENSION || size.height > MAX_DIMENSION || size.width * size.height > MAX_PIXELS) {
    throw new EvidenceValidationError('Screenshot dimensions are invalid or exceed 4096 pixels per side.');
  }
  return { contentType, sha256: createHash('sha256').update(bytes).digest('hex') };
}