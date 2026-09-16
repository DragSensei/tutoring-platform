'use client';

import * as React from 'react';
import { PasswordStepForm } from '../_components/password-step-form';

export default function PasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[75vh]">
          <div className="text-xs text-slate-400">Loading authentication...</div>
        </div>
      }
    >
      <PasswordStepForm />
    </React.Suspense>
  );
}
