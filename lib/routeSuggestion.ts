import { create } from 'zustand';

/**
 * One-shot handoff for an accepted route-order suggestion.
 *
 * The book screen sets the suggested city order here and navigates back to the
 * planner, which reorders the itinerary to match and clears it. Kept tiny — it
 * only carries the pending order between those two screens.
 */
interface PendingReorderState {
  order: string[] | null;
  setOrder: (order: string[] | null) => void;
}

export const usePendingReorder = create<PendingReorderState>((set) => ({
  order: null,
  setOrder: (order) => set({ order }),
}));
