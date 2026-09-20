import { describe, expect, it } from 'vitest';
import { getScaledImageDimensions, validateEvidenceImage } from '@/shared/utils/image-compression';

describe('session evidence image preparation', () => {
  it('accepts supported non-empty screenshot formats', () => {
    expect(validateEvidenceImage({ type: 'image/png', size: 2048 } as File)).toBeNull();
  });

  it('rejects unsupported or empty selections before compression', () => {
    expect(validateEvidenceImage({ type: 'application/pdf', size: 2048 } as File)).toContain('PNG');
    expect(validateEvidenceImage({ type: 'image/jpeg', size: 0 } as File)).toContain('empty');
  });

  it('caps oversized screenshots while preserving aspect ratio', () => {
    expect(getScaledImageDimensions({ width: 3840, height: 2160 })).toEqual({ width: 1920, height: 1080 });
    expect(getScaledImageDimensions({ width: 1200, height: 800 })).toEqual({ width: 1200, height: 800 });
  });
});
