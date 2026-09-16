import { useEffect, useState } from "react";

/**
 * Hook to prevent React hydration mismatches.
 * Returns false during SSR and true once mounted on the client.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
