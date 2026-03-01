'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { getMyTier } from './api';
import type { SubscriptionTier } from './types';

const DEFAULT_FREE_TIER: SubscriptionTier = {
  tier_id: 'free',
  naam: 'Starter',
  max_vorderingen: 3,
  max_deelbetalingen: 1,
  mag_opslaan: false,
  mag_pdf_schoon: false,
  mag_snapshots: false,
  mag_sharing: false,
};

interface SubscriptionContextType {
  tier: SubscriptionTier;
  loading: boolean;
  isPro: boolean;
  isFree: boolean;
  // Helper functions
  kanOpslaan: boolean;
  kanSchonePdf: boolean;
  kanSnapshots: boolean;
  kanSharing: boolean;
  maxVorderingen: number | null;
  maxDeelbetalingen: number | null;
  // Refresh tier info
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>(DEFAULT_FREE_TIER);
  const [loading, setLoading] = useState(true);

  const loadTier = useCallback(async () => {
    if (!user) {
      setTier(DEFAULT_FREE_TIER);
      setLoading(false);
      return;
    }

    if (demoMode) {
      // Demo mode gets pro tier
      setTier({
        tier_id: 'pro',
        naam: 'Professional',
        max_vorderingen: null,
        max_deelbetalingen: null,
        mag_opslaan: true,
        mag_pdf_schoon: true,
        mag_snapshots: true,
        mag_sharing: true,
      });
      setLoading(false);
      return;
    }

    try {
      const tierData = await getMyTier();
      setTier(tierData);
    } catch (err) {
      console.warn('Failed to load subscription tier:', err);
      setTier(DEFAULT_FREE_TIER);
    } finally {
      setLoading(false);
    }
  }, [user, demoMode]);

  useEffect(() => {
    loadTier();
  }, [loadTier]);

  const value: SubscriptionContextType = {
    tier,
    loading,
    isPro: tier.tier_id !== 'free',
    isFree: tier.tier_id === 'free',
    kanOpslaan: tier.mag_opslaan,
    kanSchonePdf: tier.mag_pdf_schoon,
    kanSnapshots: tier.mag_snapshots,
    kanSharing: tier.mag_sharing,
    maxVorderingen: tier.max_vorderingen,
    maxDeelbetalingen: tier.max_deelbetalingen,
    refresh: loadTier,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
