export type TripStyle = 'budget' | 'mid-range' | 'luxury';

export interface TripData {
  departureCity: string;
  cities: string[];
  /** Days spent in each city, same order as `cities`. */
  cityDurations: number[];
  tripStyle: TripStyle;
  startDate: string;
  endDate: string;
  travellers: number;
}

export interface CostRange {
  min: number;
  max: number;
}

export interface CityEstimate {
  name: string;
  costRange: CostRange;
  breakdown: {
    flights: CostRange;
    accommodation: CostRange;
    food: CostRange;
    activities: CostRange;
  };
}

export type TravelMode = 'flight' | 'train';

export interface TravelOption {
  id: string;
  mode: TravelMode;
  carrier: string;
  detail: string;
  price: number;
  /** Total door-to-door time in minutes (flights include airport overhead). */
  durationMinutes: number;
  /** True for the option the heuristic nudges the user toward on this leg. */
  recommended?: boolean;
  /** One-line, lowercase reason shown under the recommended option. */
  recommendReason?: string;
}

export interface TravelLeg {
  id: string;
  from: string;
  to: string;
  options: TravelOption[];
}

export interface TripEstimate {
  totalCost: CostRange;
  cities: CityEstimate[];
  legs: TravelLeg[];
  /** Inline route-efficiency callout, or null when the chosen order looks fine. */
  routeWarning: string | null;
}

/** A single thing the user tapped "book this" on, threaded into the review screen. */
export interface BookedItem {
  city: string;
  /** flight | train | hotel | restaurant | activity — display label. */
  category: 'flight' | 'train' | 'hotel' | 'restaurant' | 'activity';
  title: string;
  detail: string;
  price: number;
}

const STYLE_MULTIPLIER: Record<TripStyle, number> = {
  budget: 0.7,
  'mid-range': 1,
  luxury: 1.9,
};

function diffNights(startDate: string, endDate: string): number {
  return totalTripDays(startDate, endDate);
}

/** Total trip length in days from start to end (inclusive of partial), min 1. */
export function totalTripDays(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

// Well-known major hubs get a small nudge over smaller/quicker stops.
const MAJOR_HUBS = new Set([
  'tokyo',
  'bangkok',
  'seoul',
  'paris',
  'london',
  'new york',
  'rome',
  'barcelona',
  'singapore',
  'hong kong',
  'istanbul',
  'dubai',
  'sydney',
]);

/**
 * Suggest a starting day-split across the ordered destination cities.
 * Splits `totalDays` roughly evenly, then nudges a day toward major hubs while
 * keeping the sum exactly equal to the total.
 */
export function suggestCityDurations(cities: string[], totalDays: number): number[] {
  const count = cities.length;
  if (count === 0 || totalDays <= 0) return cities.map(() => 0);

  // Everyone gets at least 1 day; spread the rest.
  const base = Math.max(1, Math.floor(totalDays / count));
  const days = cities.map(() => base);
  let allocated = base * count;

  // Hand out any leftover days, major hubs first, then round-robin by order.
  const order = cities
    .map((c, i) => ({ i, hub: MAJOR_HUBS.has(c.trim().toLowerCase()) }))
    .sort((a, b) => Number(b.hub) - Number(a.hub));

  let cursor = 0;
  while (allocated < totalDays) {
    days[order[cursor % order.length].i] += 1;
    allocated += 1;
    cursor += 1;
  }

  // On very short trips the min-1 floor can overshoot; trim from the largest stops.
  while (allocated > totalDays) {
    let trimIdx = -1;
    let largest = 1;
    for (let i = 0; i < days.length; i++) {
      if (days[i] > largest) {
        largest = days[i];
        trimIdx = i;
      }
    }
    if (trimIdx === -1) break;
    days[trimIdx] -= 1;
    allocated -= 1;
  }

  return days;
}

function range(base: number): CostRange {
  const min = Math.round(base / 10) * 10;
  const max = Math.round((base * 1.35) / 10) * 10;
  return { min, max };
}

/** Compact USD formatter used in recommendation reasons. */
function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

// Stable pseudo-random seed from a string so prices stay consistent per leg.
function seedFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

const TRAIN_LINES = [
  'Regional Express',
  'InterCity',
  'HighSpeed Rail',
  'Coastal Line',
  'Star Line',
];
const AIRLINES = ['AirAsia', 'Japan Airlines', 'Singapore Airlines', 'Qantas', 'Emirates', 'ANA'];

/**
 * Whether a train is a plausible option for this leg. For the demo we treat
 * shorter pseudo-distances (derived from the city-name seed) as rail-friendly.
 */
function trainIsPlausible(from: string, to: string): boolean {
  return seedFromString(`${from}->${to}`) % 100 < 55;
}

/** A rough pseudo-distance (in arbitrary units) for a leg, stable per city pair. */
function legDistance(from: string, to: string): number {
  // 1 (short hop) .. ~10 (long haul), derived from the pair seed.
  return 1 + (seedFromString(`${from}~${to}`) % 100) / 11;
}

/** Format a minutes count as a human duration, e.g. "3h 30m" or "45m". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/**
 * Pick the recommended option on a leg and attach a short reason.
 *
 * Heuristic (demo only): compare the cheapest flight against the fastest train.
 * - If a train is similar or faster door-to-door AND cheaper, recommend the train.
 * - Otherwise, if a flight is meaningfully faster, recommend the flight.
 * Long hops naturally have no train option, so the flight wins by default.
 */
function applyRecommendation(options: TravelOption[]): void {
  const flights = options.filter((o) => o.mode === 'flight');
  const trains = options.filter((o) => o.mode === 'train');
  if (flights.length === 0) return;

  const bestFlight = flights.reduce((a, b) => (b.price < a.price ? b : a));

  if (trains.length === 0) {
    // No rail option — flying is the only sensible call on this hop.
    bestFlight.recommended = true;
    bestFlight.recommendReason = 'fastest realistic way to cover this distance';
    return;
  }

  const bestTrain = trains.reduce((a, b) => (b.durationMinutes < a.durationMinutes ? b : a));
  const timeGap = bestTrain.durationMinutes - bestFlight.durationMinutes; // +ve = train slower
  const saving = bestFlight.price - bestTrain.price; // +ve = train cheaper

  // Train wins if it's cheaper and not meaningfully slower (within ~45 min).
  if (saving > 0 && timeGap <= 45) {
    bestTrain.recommended = true;
    bestTrain.recommendReason =
      timeGap <= 0
        ? `cheaper and faster door-to-door — saves ${formatMoney(saving)}`
        : `similar time, ${formatMoney(saving)} cheaper`;
    return;
  }

  // Otherwise the flight's speed justifies the cost.
  bestFlight.recommended = true;
  bestFlight.recommendReason = 'faster overall once you include airport time';
}

function buildLeg(from: string, to: string, styleFactor: number, travellers: number): TravelLeg {
  const seed = seedFromString(`${from}|${to}`);
  const dist = legDistance(from, to);
  // Base flight price varies by seed and scales with style + travellers.
  const baseFlight = (180 + (seed % 320)) * styleFactor;
  const flightPrice = Math.round((baseFlight * travellers) / 10) * 10;

  // Flight: in-air time scales with distance; add fixed airport overhead (~1.5h).
  const flightAir = Math.round(35 + dist * 22);
  const airportOverhead = 95;
  const flightTotal = flightAir + airportOverhead;

  const options: TravelOption[] = [
    {
      id: `${from}-${to}-flight`,
      mode: 'flight',
      carrier: AIRLINES[seed % AIRLINES.length],
      detail: `~${formatDuration(flightAir)} flight + ~${formatDuration(airportOverhead)} airports`,
      price: flightPrice,
      durationMinutes: flightTotal,
    },
  ];

  if (trainIsPlausible(from, to)) {
    // Trains are usually cheaper but only where plausible. Door-to-door time is
    // a near-direct ride (no airport overhead), so short hops come out ahead.
    const trainPrice = Math.round((flightPrice * 0.55) / 5) * 5;
    const trainTotal = Math.round(45 + dist * 30);
    options.push({
      id: `${from}-${to}-train`,
      mode: 'train',
      carrier: TRAIN_LINES[seed % TRAIN_LINES.length],
      detail: `${formatDuration(trainTotal)} direct`,
      price: trainPrice,
      durationMinutes: trainTotal,
    });
  }

  // A few more plausible-but-fake alternatives surfaced behind "show more".
  options.push({
    id: `${from}-${to}-flight-2`,
    mode: 'flight',
    carrier: AIRLINES[(seed + 2) % AIRLINES.length],
    detail: `1 stop · ~${formatDuration(Math.round(flightTotal * 1.6))} total`,
    price: Math.round((flightPrice * 0.82) / 10) * 10,
    durationMinutes: Math.round(flightTotal * 1.6),
  });
  options.push({
    id: `${from}-${to}-flight-3`,
    mode: 'flight',
    carrier: AIRLINES[(seed + 4) % AIRLINES.length],
    detail: `premium cabin · ~${formatDuration(flightTotal)} total`,
    price: Math.round((flightPrice * 1.45) / 10) * 10,
    durationMinutes: flightTotal,
  });
  if (trainIsPlausible(from, to)) {
    const sleeperTotal = Math.round(45 + dist * 30 + 360);
    options.push({
      id: `${from}-${to}-train-2`,
      mode: 'train',
      carrier: TRAIN_LINES[(seed + 1) % TRAIN_LINES.length],
      detail: `sleeper service · ${formatDuration(sleeperTotal)}`,
      price: Math.round((flightPrice * 0.7) / 5) * 5,
      durationMinutes: sleeperTotal,
    });
  }

  applyRecommendation(options);

  // Surface the recommended option first so it stays visible before "show more".
  options.sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)));

  return { id: `${from}-${to}`, from, to, options };
}

/**
 * Lightweight, demo-only route-efficiency heuristic. We assign each city a
 * pseudo "longitude" from its name seed, then flag a stop that forces a large
 * back-and-forth versus its neighbours (a detour). Returns a single callout or null.
 */
function checkRouteEfficiency(stops: string[]): string | null {
  if (stops.length < 4) return null;
  const pos = stops.map((s) => seedFromString(s) % 100);

  for (let i = 1; i < stops.length - 1; i++) {
    const prev = pos[i - 1];
    const here = pos[i];
    const next = pos[i + 1];
    const directSpan = Math.abs(next - prev);
    const detour = Math.abs(here - prev) + Math.abs(next - here);
    // A meaningful detour: routing through `here` more than doubles the direct span.
    if (detour > directSpan * 2 && detour - directSpan > 45) {
      return `heads up — visiting ${stops[i]} between ${stops[i - 1]} and ${stops[i + 1]} adds a detour. want to try a different order?`;
    }
  }
  return null;
}

/**
 * Simulated trip estimate API.
 *
 * This is the single seam to swap for a real backend call later: replace the body
 * with a fetch/SDK request that returns the same `TripEstimate` shape. Nothing in the
 * screen depends on how this resolves, only on its return type.
 */
export async function getTripEstimate(tripData: TripData): Promise<TripEstimate> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const nights = diffNights(tripData.startDate, tripData.endDate);
  const styleFactor = STYLE_MULTIPLIER[tripData.tripStyle];
  const cityCount = Math.max(1, tripData.cities.length);
  const travellers = Math.max(1, tripData.travellers);

  const cities: CityEstimate[] = tripData.cities.map((name, index) => {
    // Days in this city: use the provided duration, falling back to an even split.
    const days = Math.max(1, Math.round(tripData.cityDurations?.[index] ?? nights / cityCount));

    // Deterministic per-city variation so numbers look plausible and stable per name.
    const variance = 0.85 + ((name.length + index) % 5) * 0.08;
    const f = styleFactor * variance;

    const flights = range(420 * travellers * f);
    // Accommodation scales with nights (days) in this city: nightly rate × nights.
    const accommodation = range(95 * days * Math.ceil(travellers / 2) * f);
    // Food and activities also scale with days spent in the city.
    const food = range(45 * days * travellers * f);
    const activities = range(60 * days * travellers * f);

    // Inter-city travel is costed via `legs` below, so the per-city total
    // excludes flights and covers stay + food + activities only.
    const costRange: CostRange = {
      min: accommodation.min + food.min + activities.min,
      max: accommodation.max + food.max + activities.max,
    };

    return {
      name,
      costRange,
      breakdown: { flights, accommodation, food, activities },
    };
  });

  // Leg-by-leg travel: departureCity -> city1 -> city2 -> ...
  const stops = [tripData.departureCity.trim(), ...tripData.cities].filter(Boolean);
  const legs: TravelLeg[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    legs.push(buildLeg(stops[i], stops[i + 1], styleFactor, travellers));
  }

  const routeWarning = checkRouteEfficiency(stops);

  // Cheapest available option per leg feeds the baseline trip total.
  const legsTotal = legs.reduce(
    (sum, leg) => sum + Math.min(...leg.options.map((o) => o.price)),
    0,
  );

  const totalCost: CostRange = cities.reduce<CostRange>(
    (acc, city) => ({
      min: acc.min + city.costRange.min,
      max: acc.max + city.costRange.max,
    }),
    { min: legsTotal, max: legsTotal },
  );

  return { totalCost, cities, legs, routeWarning };
}
