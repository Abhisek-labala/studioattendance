'use client';

import { useEffect } from 'react';

export function ClientCleanup() {
  useEffect(() => {
    // Clean up rogue/leftover service workers safely on the client after mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return null;
}

