'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/shared/components/button';

interface CopyTokenButtonProps {
  token: string;
  baseUrl?: string;
}

export function CopyTokenButton({ token, baseUrl }: CopyTokenButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
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
      size="sm"
      onClick={handleCopy}
      className="relative overflow-hidden font-mono text-xs"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-emerald-600 font-sans font-medium"
          >
            <span>✓</span> Copied Link
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 font-sans"
          >
            <span>🔗</span> Copy Token Link
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
