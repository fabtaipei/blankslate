import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

import type { BookedItem } from '@/lib/tripEstimate';

/**
 * A confirmed trip, persisted so the user keeps ongoing access to their
 * itinerary, map, and calendar after booking — not just a one-time message.
 */
export interface SavedTrip {
  departureCity: string;
  /** Destination cities in visiting order. */
  cities: string[];
  /** Days spent in each city, same order as `cities`. */
  cityDurations: number[];
  startDate: string;
  endDate: string;
  travellers: number;
  total: number;
  /** Everything the user booked, in trip order. */
  items: BookedItem[];
  /** When the trip was confirmed (ISO timestamp). */
  confirmedAt: string;
}

const STORAGE_KEY = 'bilt-budget.saved-trip.v1';

interface SavedTripState {
  trip: SavedTrip | null;
  /** True until the persisted trip has been read from storage once. */
  hydrated: boolean;
  saveTrip: (trip: SavedTrip) => Promise<void>;
  clearTrip: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function isSavedTrip(value: unknown): value is SavedTrip {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cities' in value &&
    'items' in value &&
    'total' in value
  );
}

export const useSavedTripStore = create<SavedTripState>((set, get) => ({
  trip: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      set({ trip: isSavedTrip(parsed) ? parsed : null, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  saveTrip: async (trip) => {
    set({ trip, hydrated: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    } catch {
      // Persisting is best-effort; the in-memory trip still works this session.
    }
  },

  clearTrip: async () => {
    set({ trip: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));

/**
 * Hydrate the saved trip from storage once on mount. Returns the current trip
 * and whether hydration has completed.
 */
export function useSavedTrip(): { trip: SavedTrip | null; hydrated: boolean } {
  const trip = useSavedTripStore((s) => s.trip);
  const hydrated = useSavedTripStore((s) => s.hydrated);
  const hydrate = useSavedTripStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { trip, hydrated };
}
