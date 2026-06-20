export type City = {
  name: string;
  country: string;
};

// A hand-picked list of well-known cities — major capitals, popular travel
// destinations, plus a few name-collision examples (New York / Newport /
// New Delhi, Cambridge UK / Cambridge MA) so partial matches feel real.
export const CITIES: City[] = [
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Kyoto', country: 'Japan' },
  { name: 'Osaka', country: 'Japan' },
  { name: 'Bangkok', country: 'Thailand' },
  { name: 'Chiang Mai', country: 'Thailand' },
  { name: 'Phuket', country: 'Thailand' },
  { name: 'Seoul', country: 'South Korea' },
  { name: 'Busan', country: 'South Korea' },
  { name: 'Beijing', country: 'China' },
  { name: 'Shanghai', country: 'China' },
  { name: 'Hong Kong', country: 'China' },
  { name: 'Taipei', country: 'Taiwan' },
  { name: 'Singapore', country: 'Singapore' },
  { name: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Jakarta', country: 'Indonesia' },
  { name: 'Hanoi', country: 'Vietnam' },
  { name: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'Manila', country: 'Philippines' },
  { name: 'New Delhi', country: 'India' },
  { name: 'Mumbai', country: 'India' },
  { name: 'Jaipur', country: 'India' },
  { name: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Doha', country: 'Qatar' },
  { name: 'Istanbul', country: 'Turkey' },
  { name: 'Tel Aviv', country: 'Israel' },
  { name: 'Cairo', country: 'Egypt' },
  { name: 'Marrakech', country: 'Morocco' },
  { name: 'Cape Town', country: 'South Africa' },
  { name: 'Nairobi', country: 'Kenya' },
  { name: 'London', country: 'United Kingdom' },
  { name: 'Cambridge', country: 'United Kingdom' },
  { name: 'Edinburgh', country: 'United Kingdom' },
  { name: 'Manchester', country: 'United Kingdom' },
  { name: 'Dublin', country: 'Ireland' },
  { name: 'Paris', country: 'France' },
  { name: 'Nice', country: 'France' },
  { name: 'Lyon', country: 'France' },
  { name: 'Amsterdam', country: 'Netherlands' },
  { name: 'Brussels', country: 'Belgium' },
  { name: 'Berlin', country: 'Germany' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Zurich', country: 'Switzerland' },
  { name: 'Geneva', country: 'Switzerland' },
  { name: 'Vienna', country: 'Austria' },
  { name: 'Prague', country: 'Czech Republic' },
  { name: 'Budapest', country: 'Hungary' },
  { name: 'Warsaw', country: 'Poland' },
  { name: 'Krakow', country: 'Poland' },
  { name: 'Copenhagen', country: 'Denmark' },
  { name: 'Stockholm', country: 'Sweden' },
  { name: 'Oslo', country: 'Norway' },
  { name: 'Helsinki', country: 'Finland' },
  { name: 'Reykjavik', country: 'Iceland' },
  { name: 'Madrid', country: 'Spain' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Seville', country: 'Spain' },
  { name: 'Lisbon', country: 'Portugal' },
  { name: 'Porto', country: 'Portugal' },
  { name: 'Rome', country: 'Italy' },
  { name: 'Florence', country: 'Italy' },
  { name: 'Venice', country: 'Italy' },
  { name: 'Milan', country: 'Italy' },
  { name: 'Naples', country: 'Italy' },
  { name: 'Athens', country: 'Greece' },
  { name: 'Santorini', country: 'Greece' },
  { name: 'New York', country: 'United States' },
  { name: 'Newport', country: 'United States' },
  { name: 'Los Angeles', country: 'United States' },
  { name: 'San Francisco', country: 'United States' },
  { name: 'Chicago', country: 'United States' },
  { name: 'Boston', country: 'United States' },
  { name: 'Cambridge', country: 'United States' },
  { name: 'Miami', country: 'United States' },
  { name: 'Las Vegas', country: 'United States' },
  { name: 'Seattle', country: 'United States' },
  { name: 'New Orleans', country: 'United States' },
  { name: 'Honolulu', country: 'United States' },
  { name: 'Toronto', country: 'Canada' },
  { name: 'Vancouver', country: 'Canada' },
  { name: 'Montreal', country: 'Canada' },
  { name: 'Mexico City', country: 'Mexico' },
  { name: 'Cancun', country: 'Mexico' },
  { name: 'Havana', country: 'Cuba' },
  { name: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Sao Paulo', country: 'Brazil' },
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'Lima', country: 'Peru' },
  { name: 'Cusco', country: 'Peru' },
  { name: 'Santiago', country: 'Chile' },
  { name: 'Bogota', country: 'Colombia' },
  { name: 'Cartagena', country: 'Colombia' },
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Brisbane', country: 'Australia' },
  { name: 'Auckland', country: 'New Zealand' },
  { name: 'Queenstown', country: 'New Zealand' },
];

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
