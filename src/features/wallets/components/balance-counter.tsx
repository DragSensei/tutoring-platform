'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { formatEGP } from '@/shared/utils/currency';

interface BalanceCounterProps {
  value: number;
  className?: string;
  showWarningIfNegative?: boolean;
}

export function BalanceCounter({
  value,
  className = '',
  showWarningIfNegative = true,
}: BalanceCounterProps) {
  const spring = useSpring(value, { stiffness: 90, damping: 15 });
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  React.useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [spring]);

  const isNegative = value < 0;

  return (
    <div className={`flex flex-col ${className}`}>
      <motion.span
        key={value}
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`text-3xl font-extrabold tracking-tight font-mono ${
          isNegative ? 'text-rose-600' : 'text-emerald-600'
        }`}
      >
        {formatEGP(displayValue)}
      </motion.span>
      {isNegative && showWarningIfNegative && (
        <span className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1">
          ⚠️ Negative Balance (Credit / Post-Paid Session Incurred)
        </span>
      )}
    </div>
  );
}
