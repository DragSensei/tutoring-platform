'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { savePricingProfile, type PricingProfileInput } from '@/features/policies/server/policy-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatEGP } from '@/shared/utils/currency';

export interface PricingProfileItem extends PricingProfileInput {
  id: string;
  isActive: boolean;
}

export function PricingProfilesPanel({ profiles }: { profiles: PricingProfileItem[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [privatePrice, setPrivatePrice] = React.useState('500.00');
  const [groupPrice, setGroupPrice] = React.useState('375.00');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const selectProfile = (profile: PricingProfileItem) => {
    setSelectedId(profile.id);
    setName(profile.name);
    setPrivatePrice(profile.privateSessionPrice);
    setGroupPrice(profile.groupSessionPrice);
    setError('');
  };

  const reset = () => {
    setSelectedId(null);
    setName('');
    setPrivatePrice('500.00');
    setGroupPrice('375.00');
    setError('');
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const input = { name, privateSessionPrice: privatePrice, groupSessionPrice: groupPrice };
    startTransition(() => {
      void savePricingProfile(selectedId, input).then(() => {
        reset();
        router.refresh();
      }).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not save Pricing Profile.');
      });
    });
  };

  return (
    <Card className="border-border-subtle bg-canvas shadow-xs">
      <CardHeader>
        <CardTitle className="text-text-primary">Named Pricing Profiles</CardTitle>
        <p className="text-sm text-text-muted">Series may select an active profile. Unselected series use current platform fallback rates. Prices snapshot only at final settlement.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
        <form onSubmit={save} className="space-y-4 rounded-xl border border-border-subtle bg-canvas-subtle p-4">
          <h3 className="text-sm font-bold text-text-primary">{selectedId ? 'Edit Pricing Profile' : 'Create Pricing Profile'}</h3>
          <label className="block text-xs font-semibold text-text-primary">Profile name
            <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-text-primary">Private session price (EGP)
            <input required type="number" min="0" step="0.01" value={privatePrice} onChange={(event) => setPrivatePrice(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-text-primary">Group session price (EGP)
            <input required type="number" min="0" step="0.01" value={groupPrice} onChange={(event) => setGroupPrice(event.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-border-strong bg-canvas px-3 text-sm" />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-brand-primary">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={isPending} className="min-h-[44px] flex-1 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-brand-subtle hover:bg-brand-hover disabled:opacity-60">{isPending ? 'Saving…' : selectedId ? 'Save profile' : 'Create profile'}</button>
            {selectedId && <button type="button" onClick={reset} className="min-h-[44px] rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary">Cancel edit</button>}
          </div>
        </form>
        <div className="space-y-3">
          {profiles.length ? profiles.map((profile) => (
            <article key={profile.id} className="flex flex-col gap-3 rounded-xl border border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold text-text-primary">{profile.name}</h3>
                <p className="mt-1 text-xs text-text-muted">Private {formatEGP(profile.privateSessionPrice)} · Group {formatEGP(profile.groupSessionPrice)}</p>
              </div>
              <button type="button" onClick={() => selectProfile(profile)} className="min-h-[44px] shrink-0 rounded-lg border border-border-strong px-4 text-sm font-semibold text-text-primary hover:bg-canvas-subtle">Edit profile</button>
            </article>
          )) : <p className="rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-muted">No profiles yet. Series without a selection use the Platform Policies fallback.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
