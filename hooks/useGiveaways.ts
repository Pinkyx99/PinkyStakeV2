import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';

const GIVEAWAY_COOLDOWNS = {
  hourly: 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
  weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const ACCOUNT_AGE_REQUIREMENTS = {
  hourly: 1 * 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
  weekly: 24 * 60 * 60 * 1000, // 24 hours as per prompt
};

type GiveawayType = 'hourly' | 'daily' | 'weekly';

const getLocalStorageKey = (profileId: string, type: GiveawayType) => `giveaway_${profileId}_${type}`;

export const useGiveaway = (type: GiveawayType) => {
  const { profile } = useAuth();
  const [nextClaimTime, setNextClaimTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load initial claim time from localStorage
  useEffect(() => {
    if (profile) {
      const key = getLocalStorageKey(profile.id, type);
      const storedTime = localStorage.getItem(key);
      setNextClaimTime(storedTime ? parseInt(storedTime, 10) : 0);
    }
  }, [profile, type]);

  // Timer effect
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, nextClaimTime - Date.now());
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextClaimTime]);

  const accountAgeMs = profile ? Date.now() - new Date(profile.created_at).getTime() : 0;
  const hasMetAgeRequirement = accountAgeMs >= ACCOUNT_AGE_REQUIREMENTS[type];
  const canClaim = timeLeft <= 0 && hasMetAgeRequirement;

  const claim = useCallback(() => {
    if (canClaim && profile) {
      const newNextClaimTime = Date.now() + GIVEAWAY_COOLDOWNS[type];
      const key = getLocalStorageKey(profile.id, type);
      localStorage.setItem(key, newNextClaimTime.toString());
      setNextClaimTime(newNextClaimTime);
      return true;
    }
    return false;
  }, [canClaim, type, profile]);

  return { timeLeft, canClaim, hasMetAgeRequirement, claim };
};
