'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Check } from 'lucide-react';
import { Button } from '@/shared/components/button';

interface CopyTokenButtonProps {
  token: string;
  baseUrl?: string;
  className?: string;
}

export function CopyTokenButton({ token, baseUrl, className }: CopyTokenButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${origin}/attend/${token}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant={copied ? 'secondary' : 'outline'}
      onClick={handleCopy}
      className={`min-h-[44px] px-3.5 text-sm relative overflow-hidden font-medium ${className || ''}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-emerald-600 font-medium text-sm"
          >
            <Check className="h-4 w-4" />
            <span>Attendance Link Copied</span>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-stone-700 font-medium text-sm"
          >
            <Link2 className="h-4 w-4 text-stone-400" />
            <span>Copy Attendance Link</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
