/**
 * Real hotels from the Ltravel backend (LiteAPI).
 *
 * Mirrors the existing getTripEstimate() helper: hardcoded live URL, and a
 * graceful empty result on any failure so the booking screen keeps its
 * synthetic fallback options instead of erroring. Needs the full trip (for the
 * per-city check-in/out dates the backend derives).
 */

import type { TripData } from './tripEstimate';

const API_BASE = 'https://ltravel-api.vercel.app';

export interface HotelSuggestion {
  city: string;
  name: string;
  rating: number | null;
  reviewScore: number | null;
  currency: string;
  totalAmount: number;
  nights: number;
  pricePerNight: number;
  address: string;
}

/** One cheapest hotel per city. Returns [] on any error. */
export async function getHotels(tripData: TripData): Promise<HotelSuggestion[]> {
  try {
    const res = await fetch(`${API_BASE}/api/hotels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hotels?: HotelSuggestion[] };
    return data.hotels ?? [];
  } catch {
    return [];
  }
}
