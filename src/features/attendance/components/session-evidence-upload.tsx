'use client';

import * as React from 'react';
import { FileImage, LoaderCircle, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { compressEvidenceImage, validateEvidenceImage } from '@/shared/utils/image-compression';

export interface LocalEvidenceMetadata {
  name: string;
  size: number;
  type: string;
}

interface SessionEvidenceUploadProps {
  value: LocalEvidenceMetadata | null;
  onChange: (value: LocalEvidenceMetadata | null, file: File | null) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionEvidenceUpload({ value, onChange }: SessionEvidenceUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateEvidenceImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsCompressing(true);
    try {
      const compressed = await compressEvidenceImage(file);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(compressed);
      });
      onChange({ name: compressed.name, size: compressed.size, type: compressed.type }, compressed);
    } catch (compressionError) {
      setError(compressionError instanceof Error ? compressionError.message : 'The image could not be compressed.');
    } finally {
      setIsCompressing(false);
    }
  };

  const clearEvidence = () => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
    onChange(null, null);
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4" aria-labelledby="evidence-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="evidence-title" className="text-sm font-semibold text-stone-900">Session screenshot evidence <span className="text-brand-primary">Required</span></h3>
          <p className="mt-1 text-xs text-stone-500">PNG, JPEG, or WebP. Compressed in this browser; nothing is uploaded yet.</p>
        </div>
        <FileImage className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void selectFile(event.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs are not compatible with the image optimizer. */}
          <img src={previewUrl} alt="Compressed session evidence preview" className="max-h-48 w-full object-contain bg-stone-100" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <p className="min-w-0 text-xs text-stone-600"><span className="font-medium text-stone-900">{value?.name}</span> · {value && formatBytes(value.size)}</p>
            <Button type="button" variant="ghost" className="min-h-[44px] px-2 text-brand-primary" onClick={clearEvidence}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : value ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-xs text-stone-600"><span className="font-medium text-stone-900">{value.name}</span> · {formatBytes(value.size)} <span className="text-stone-400">(selected locally)</span></p>
          <Button type="button" variant="outline" className="min-h-[44px] px-3" onClick={() => inputRef.current?.click()}>Replace</Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isCompressing}
          onClick={() => inputRef.current?.click()}
          onDrop={(event) => {
            event.preventDefault();
            void selectFile(event.dataTransfer.files[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
          className="mt-4 flex min-h-[112px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white px-4 text-center text-sm font-medium text-stone-700 transition-colors hover:border-brand-border hover:bg-brand-subtle/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
        >
          {isCompressing ? <LoaderCircle className="mb-2 h-5 w-5 animate-spin text-brand-primary" /> : <UploadCloud className="mb-2 h-5 w-5 text-stone-400" />}
          {isCompressing ? 'Compressing screenshot…' : 'Select or drop a session screenshot'}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-brand-primary">{error}</p>}
    </section>
  );
}
