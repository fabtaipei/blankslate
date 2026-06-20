export type City = {
  name: string;
  country: string;
  /** Approximate city-center latitude (decimal degrees). */
  lat: number;
  /** Approximate city-center longitude (decimal degrees). */
  lng: number;
};

// A hand-picked list of well-known cities — major capitals, popular travel
// destinations, plus a few name-collision examples (New York / Newport /
// New Delhi, Cambridge UK / Cambridge MA) so partial matches feel real.
// Coordinates are approximate city-center points, good enough for plotting a
// trip itinerary on a map.
export const CITIES: City[] = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681 },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.7883, lng: 98.9853 },
  { name: 'Phuket', country: 'Thailand', lat: 7.8804, lng: 98.3923 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { name: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { name: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869 },
  { name: 'Bali', country: 'Indonesia', lat: -8.4095, lng: 115.1889 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0278, lng: 105.8342 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Marrakech', country: 'Morocco', lat: 31.6295, lng: -7.9811 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Cambridge', country: 'United Kingdom', lat: 52.2053, lng: 0.1218 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lng: -3.1883 },
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.262 },
  { name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Hamburg', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Krakow', country: 'Poland', lat: 50.0647, lng: 19.945 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lng: -21.9426 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Seville', country: 'Spain', lat: 37.3891, lng: -5.9845 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Florence', country: 'Italy', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Santorini', country: 'Greece', lat: 36.3932, lng: 25.4615 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'Newport', country: 'United States', lat: 41.4901, lng: -71.3128 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589 },
  { name: 'Cambridge', country: 'United States', lat: 42.3736, lng: -71.1097 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'Las Vegas', country: 'United States', lat: 36.1699, lng: -115.1398 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'New Orleans', country: 'United States', lat: 29.9511, lng: -90.0715 },
  { name: 'Honolulu', country: 'United States', lat: 21.3069, lng: -157.8583 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Cancun', country: 'Mexico', lat: 21.1619, lng: -86.8515 },
  { name: 'Havana', country: 'Cuba', lat: 23.1136, lng: -82.3666 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5558, lng: -46.6396 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
  { name: 'Cusco', country: 'Peru', lat: -13.5319, lng: -71.9675 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Bogota', country: 'Colombia', lat: 4.711, lng: -74.0721 },
  { name: 'Cartagena', country: 'Colombia', lat: 10.391, lng: -75.4794 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },
  { name: 'Queenstown', country: 'New Zealand', lat: -45.0312, lng: 168.6626 },
];

export interface CityCoords {
  latitude: number;
  longitude: number;
}

// Case-insensitive name → city lookup, built once.
const CITY_BY_NAME = new Map<string, City>(CITIES.map((c) => [c.name.toLowerCase(), c]));

/**
 * Resolve a city name to coordinates. Known cities use their real-ish center.
 * Unknown / free-typed cities get a stable, deterministic pseudo-location
 * derived from the name, so the itinerary map still plots a point for them.
 */
export function getCityCoords(name: string): CityCoords {
  const match = CITY_BY_NAME.get(name.trim().toLowerCase());
  if (match) return { latitude: match.lat, longitude: match.lng };

  // Deterministic fallback: hash the name into a plausible land-ish lat/lng.
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1000000;
  }
  const latitude = ((hash % 12000) / 100 - 50) * 0.9; // ~ -45..+63
  const longitude = (Math.floor(hash / 12000) % 36000) / 100 - 180; // -180..+180
  return { latitude, longitude };
}

// Case-insensitive, starts-with-aware match across the city list. A city ranks
// higher when its name (or a word within it) starts with the query than when
// the query merely appears somewhere inside it.
export function searchCities(query: string, exclude: string[] = [], limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const excludeSet = new Set(exclude.map((c) => c.toLowerCase()));

  const scored: { city: City; score: number }[] = [];
  for (const city of CITIES) {
    const name = city.name.toLowerCase();
    if (excludeSet.has(name)) continue;

    let score = -1;
    if (name.startsWith(q)) {
      score = 0;
    } else if (name.split(/\s+/).some((word) => word.startsWith(q))) {
      score = 1;
    } else if (name.includes(q) || city.country.toLowerCase().includes(q)) {
      score = 2;
    }

    if (score >= 0) scored.push({ city, score });
  }

  scored.sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name));
  return scored.slice(0, limit).map((s) => s.city);
}
