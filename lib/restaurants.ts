/**
 * Real restaurants from the Ltravel backend (Google Places).
 *
 * Mirrors the existing getTripEstimate() helper: hardcoded live URL, and a
 * graceful empty result on any failure so the booking screen keeps its
 * synthetic fallback options instead of erroring.
 */

import type { TripStyle } from './tripEstimate';

const API_BASE = 'https://ltravel-api.vercel.app';

export interface RestaurantSuggestion {
  city: string;
  name: string;
  rating: number | null;
  priceSymbol: string | null;
  priceEstimateUsd: number | null;
  address: string;
}

/** One top restaurant per city. Returns [] on any error. */
export async function getRestaurants(
  cities: string[],
  tripStyle: TripStyle,
): Promise<RestaurantSuggestion[]> {
  if (cities.length === 0) return [];
  try {
    const res = await fetch(`${API_BASE}/api/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cities, tripStyle }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { restaurants?: RestaurantSuggestion[] };
    return data.restaurants ?? [];
  } catch {
    return [];
  }
}
