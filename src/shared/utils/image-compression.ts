export const MAX_EVIDENCE_DIMENSION = 1920; // Browser-only safeguard for readable, future upload-ready screenshots.
export const EVIDENCE_IMAGE_QUALITY = 0.84;

export interface ImageDimensions {
  width: number;
  height: number;
}

export function validateEvidenceImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Choose a PNG, JPEG, or WebP image.';
  }
  if (file.size === 0) return 'The selected image is empty.';
  return null;
}

export function getScaledImageDimensions({ width, height }: ImageDimensions): ImageDimensions {
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_EVIDENCE_DIMENSION) return { width, height };
  const scale = MAX_EVIDENCE_DIMENSION / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function compressEvidenceImage(file: File): Promise<File> {
  const validationError = validateEvidenceImage(file);
  if (validationError) throw new Error(validationError);

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The image could not be read.'));
      element.src = sourceUrl;
    });
    const dimensions = getScaledImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('The image could not be compressed.'))), 'image/webp', EVIDENCE_IMAGE_QUALITY);
    });
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'session-evidence'}.webp`;
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
