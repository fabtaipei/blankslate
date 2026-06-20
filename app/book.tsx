import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Surface, Text } from 'heroui-native';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  Plane,
  Plus,
  Train,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import type {
  BookedItem,
  CityEstimate,
  CostRange,
  TravelLeg,
  TravelOption,
  TripEstimate,
} from '@/lib/tripEstimate';

// bilt.me brand palette
const BRAND = {
  pink: '#CD1A6F',
  purple: '#6320EE',
  pinkSoft: 'rgba(205, 26, 111, 0.10)',
  purpleSoft: 'rgba(99, 32, 238, 0.10)',
};

// SF Pro on Apple platforms (System maps to SF Pro), graceful fallback elsewhere.
const BODY_FONT = Platform.select({
  ios: 'System',
  default: undefined,
});

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function formatRange(range: CostRange): string {
  return `${formatMoney(range.min)} – ${formatMoney(range.max)}`;
}

function formatDates(start: string, end: string): string | null {
  if (!start) return null;
  try {
    const startLabel = format(new Date(`${start}T00:00:00`), 'MMM d');
    if (!end || end === start) return startLabel;
    const endLabel = format(new Date(`${end}T00:00:00`), 'MMM d, yyyy');
    return `${startLabel} – ${endLabel}`;
  } catch {
    return null;
  }
}

type BookableCategory = 'accommodation' | 'food' | 'activities';

interface BookableOption {
  id: string;
  city: string;
  category: BookableCategory;
  title: string;
  detail: string;
  price: number;
}

interface Suggestion {
  title: string;
  detail: string;
}

// Hand-picked, well-known-sounding venues for popular cities so suggestions feel real.
const FOOD_BY_CITY: Record<string, Suggestion[]> = {
  tokyo: [
    { title: 'Ichiran Ramen', detail: 'casual, local favorite' },
    { title: 'Narisawa', detail: 'fine dining tasting menu' },
  ],
  bangkok: [
    { title: 'Jay Fai', detail: 'michelin street-food legend' },
    { title: 'Gaggan', detail: 'progressive indian tasting menu' },
  ],
  seoul: [
    { title: 'Myeongdong Kyoja', detail: 'classic kalguksu noodles' },
    { title: 'Jungsik', detail: 'modern korean fine dining' },
  ],
  paris: [
    { title: "L'As du Fallafel", detail: 'marais street eats' },
    { title: 'Le Comptoir du Relais', detail: 'classic bistro tasting' },
  ],
  london: [
    { title: 'Dishoom', detail: 'bombay-style café' },
    { title: 'The Clove Club', detail: 'tasting menu, shoreditch' },
  ],
  'new york': [
    { title: "Joe's Pizza", detail: 'greenwich village slice' },
    { title: 'Le Bernardin', detail: 'seafood tasting menu' },
  ],
  rome: [
    { title: 'Da Enzo al 29', detail: 'trastevere trattoria' },
    { title: 'La Pergola', detail: 'rooftop fine dining' },
  ],
  barcelona: [
    { title: 'El Quim de la Boqueria', detail: 'market tapas bar' },
    { title: 'Disfrutar', detail: 'creative tasting menu' },
  ],
};

const ACTIVITIES_BY_CITY: Record<string, Suggestion[]> = {
  tokyo: [
    { title: 'teamLab Planets', detail: 'immersive art museum' },
    { title: 'Tsukiji Outer Market food tour', detail: 'guided morning walk' },
  ],
  bangkok: [
    { title: 'Grand Palace tour', detail: 'guided morning visit' },
    { title: 'Damnoen Saduak floating market', detail: 'half-day boat trip' },
  ],
  seoul: [
    { title: 'Gyeongbokgung Palace', detail: 'hanbok rental + tour' },
    { title: 'Bukchon Hanok Village walk', detail: 'guided neighbourhood stroll' },
  ],
  paris: [
    { title: 'Louvre skip-the-line', detail: 'timed entry ticket' },
    { title: 'Seine evening cruise', detail: 'sunset boat ride' },
  ],
  london: [
    { title: 'Tower of London', detail: 'crown jewels entry' },
    { title: 'West End show', detail: 'evening theatre ticket' },
  ],
  'new york': [
    { title: 'Edge observation deck', detail: 'hudson yards skyline' },
    { title: 'Broadway show', detail: 'evening theatre ticket' },
  ],
  rome: [
    { title: 'Colosseum + Forum', detail: 'skip-the-line guided tour' },
    { title: 'Vatican Museums', detail: 'sistine chapel entry' },
  ],
  barcelona: [
    { title: 'Sagrada Família', detail: 'timed entry + audio guide' },
    { title: 'Park Güell', detail: 'gaudí gardens ticket' },
  ],
};

function genericFood(city: string): Suggestion[] {
  return [
    { title: `${city} Street Kitchen`, detail: 'casual, local favorite' },
    { title: `Maison ${city}`, detail: 'chef tasting menu' },
    { title: `${city} Night Market`, detail: 'street-food crawl' },
    { title: `Café ${city}`, detail: 'brunch & coffee spot' },
    { title: `The ${city} Grill`, detail: 'modern bistro dinner' },
  ];
}

function genericActivities(city: string): Suggestion[] {
  return [
    { title: `${city} old town walking tour`, detail: 'guided half-day' },
    { title: `${city} highlights day pass`, detail: 'top sights, skip the line' },
    { title: `${city} food & culture tour`, detail: 'small-group afternoon' },
    { title: `${city} sunset viewpoint`, detail: 'evening photo spot' },
    { title: `${city} museum pass`, detail: 'two-day all-access' },
  ];
}

// Extra, behind-"show more" venues for popular cities, appended to the curated pair.
const FOOD_EXTRA_BY_CITY: Record<string, Suggestion[]> = {
  tokyo: [
    { title: 'Sushi Dai', detail: 'tsukiji counter sushi' },
    { title: 'Afuri', detail: 'yuzu shio ramen' },
    { title: 'Gonpachi', detail: 'izakaya, kill bill room' },
  ],
  bangkok: [
    { title: 'Thip Samai', detail: 'legendary pad thai' },
    { title: 'Err', detail: 'urban rustic thai' },
    { title: 'Sorn', detail: 'southern thai fine dining' },
  ],
  seoul: [
    { title: 'Gwangjang Market', detail: 'bindaetteok & mayak gimbap' },
    { title: 'Mingles', detail: 'contemporary korean tasting' },
    { title: 'Tosokchon', detail: 'samgyetang ginseng chicken' },
  ],
  paris: [
    { title: 'Du Pain et des Idées', detail: 'classic boulangerie' },
    { title: 'Septime', detail: 'neo-bistro tasting' },
    { title: 'Breizh Café', detail: 'modern crêperie' },
  ],
  london: [
    { title: 'Borough Market', detail: 'food market grazing' },
    { title: 'St. John', detail: 'nose-to-tail british' },
    { title: 'Padella', detail: 'handmade pasta bar' },
  ],
  'new york': [
    { title: 'Katz’s Delicatessen', detail: 'pastrami on rye' },
    { title: 'Lilia', detail: 'brooklyn handmade pasta' },
    { title: 'Russ & Daughters', detail: 'classic appetizing' },
  ],
  rome: [
    { title: 'Roscioli', detail: 'deli & carbonara' },
    { title: 'Pizzarium', detail: 'bonci pizza al taglio' },
    { title: 'Armando al Pantheon', detail: 'roman trattoria' },
  ],
  barcelona: [
    { title: 'Bar del Pla', detail: 'modern tapas' },
    { title: 'Tickets', detail: 'adrià tapas theatre' },
    { title: 'Cal Pep', detail: 'seafood counter bar' },
  ],
};

const ACTIVITIES_EXTRA_BY_CITY: Record<string, Suggestion[]> = {
  tokyo: [
    { title: 'Shibuya Sky', detail: 'rooftop observation deck' },
    { title: 'Meiji Shrine + Harajuku', detail: 'guided morning walk' },
    { title: 'Robot Restaurant show', detail: 'evening cabaret' },
  ],
  bangkok: [
    { title: 'Wat Arun + canal tour', detail: 'longtail boat ride' },
    { title: 'Chatuchak weekend market', detail: 'self-guided browse' },
    { title: 'Muay thai night', detail: 'ringside seats' },
  ],
  seoul: [
    { title: 'N Seoul Tower', detail: 'cable car + observatory' },
    { title: 'DMZ day trip', detail: 'guided border tour' },
    { title: 'Han River cruise', detail: 'evening sightseeing' },
  ],
  paris: [
    { title: 'Eiffel Tower summit', detail: 'lift to the top' },
    { title: "Musée d'Orsay", detail: 'impressionist collection' },
    { title: 'Montmartre walking tour', detail: 'artists’ quarter' },
  ],
  london: [
    { title: 'British Museum tour', detail: 'guided highlights' },
    { title: 'London Eye', detail: 'thames skyline pod' },
    { title: 'Harry Potter studio tour', detail: 'half-day with transfer' },
  ],
  'new york': [
    { title: 'Statue of Liberty + Ellis', detail: 'ferry & museum' },
    { title: 'MoMA', detail: 'modern art admission' },
    { title: 'Central Park bike tour', detail: 'guided loop' },
  ],
  rome: [
    { title: 'Borghese Gallery', detail: 'timed entry tour' },
    { title: 'Trastevere food walk', detail: 'evening tasting' },
    { title: 'Catacombs tour', detail: 'underground rome' },
  ],
  barcelona: [
    { title: 'Casa Batlló', detail: 'gaudí house + audio' },
    { title: 'Montjuïc cable car', detail: 'hilltop views' },
    { title: 'Gothic Quarter tapas tour', detail: 'small-group evening' },
  ],
};

function foodSuggestions(key: string, city: string): Suggestion[] {
  const base = FOOD_BY_CITY[key];
  if (base) return [...base, ...(FOOD_EXTRA_BY_CITY[key] ?? [])];
  return genericFood(city);
}

function activitySuggestions(key: string, city: string): Suggestion[] {
  const base = ACTIVITIES_BY_CITY[key];
  if (base) return [...base, ...(ACTIVITIES_EXTRA_BY_CITY[key] ?? [])];
  return genericActivities(city);
}

// Spread N prices evenly across a range (low to high), rounded to the nearest $5.
function spreadPrices(range: CostRange, count: number): number[] {
  if (count <= 1) return [Math.round(range.min / 5) * 5];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.15 + (0.7 * i) / (count - 1);
    out.push(Math.round((range.min + (range.max - range.min) * t) / 5) * 5);
  }
  return out;
}

// Concrete, fake-but-plausible bookable options derived from each city's price ranges.
function buildOptions(cities: CityEstimate[]): BookableOption[] {
  const out: BookableOption[] = [];

  const HOTEL_NAMES = [
    'City Center Hostel',
    'Sakura Boutique Hotel',
    'Riverside Inn',
    'Old Town Guesthouse',
    'Harbour Grand Hotel',
  ];
  const HOTEL_DETAILS = [
    'dorm bed, central',
    'boutique double room',
    'mid-range, river view',
    'cozy private room',
    'upscale, full service',
  ];

  cities.forEach((city, index) => {
    const key = city.name.trim().toLowerCase();

    // Accommodation: a spread of stays from budget to upscale.
    const stayPrices = spreadPrices(city.breakdown.accommodation, HOTEL_NAMES.length);
    HOTEL_NAMES.forEach((name, i) => {
      out.push({
        id: `${city.name}-accommodation-${i}`,
        city: city.name,
        category: 'accommodation',
        title: name,
        detail: `${city.name} · ${HOTEL_DETAILS[(index + i) % HOTEL_DETAILS.length]}`,
        price: stayPrices[i],
      });
    });

    // Food: suggested restaurants, cheaper ones first.
    const foodSugg = foodSuggestions(key, city.name);
    const foodPrices = spreadPrices(city.breakdown.food, foodSugg.length);
    foodSugg.forEach((s, i) => {
      out.push({
        id: `${city.name}-food-${i}`,
        city: city.name,
        category: 'food',
        title: s.title,
        detail: s.detail,
        price: foodPrices[i],
      });
    });

    // Activities: suggested experiences, cheaper ones first.
    const actSugg = activitySuggestions(key, city.name);
    const actPrices = spreadPrices(city.breakdown.activities, actSugg.length);
    actSugg.forEach((s, i) => {
      out.push({
        id: `${city.name}-activities-${i}`,
        city: city.name,
        category: 'activities',
        title: s.title,
        detail: s.detail,
        price: actPrices[i],
      });
    });
  });

  return out;
}

function isTripEstimate(value: unknown): value is TripEstimate {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totalCost' in value &&
    'cities' in value &&
    'legs' in value
  );
}

function LegOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: TravelOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.mode === 'train' ? Train : Plane;
  return (
    <View className="py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3 pr-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: selected ? BRAND.purpleSoft : '#f0f0f0' }}
          >
            <Icon size={17} color={selected ? BRAND.purple : '#6b6b6b'} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-base"
                style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
              >
                {option.carrier}
              </Text>
              {option.recommended ? (
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: BRAND.pink }}>
                  <Text
                    className="text-[11px]"
                    style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
                  >
                    recommended
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-0.5 text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
              {option.detail} · {formatMoney(option.price)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onSelect}
          hitSlop={6}
          className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
          style={{ backgroundColor: selected ? BRAND.purpleSoft : BRAND.pink }}
        >
          {selected ? (
            <>
              <Check size={15} color={BRAND.purple} strokeWidth={2.5} />
              <Text
                className="text-sm"
                style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
              >
                added
              </Text>
            </>
          ) : (
            <>
              <Plus size={15} color="#fff" strokeWidth={2.5} />
              <Text
                className="text-sm"
                style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#fff' }}
              >
                book this
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {option.recommended && option.recommendReason ? (
        <Text
          className="mt-1.5 pl-12 text-sm"
          style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
        >
          {option.recommendReason}
        </Text>
      ) : null}
    </View>
  );
}

function OptionRow({
  option,
  added,
  onToggle,
}: {
  option: BookableOption;
  added: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text
          className="text-base"
          style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
        >
          {option.title}
        </Text>
        <Text className="mt-0.5 text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
          {option.detail} · {formatMoney(option.price)}
        </Text>
      </View>

      <Pressable
        onPress={onToggle}
        hitSlop={6}
        className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
        style={{
          backgroundColor: added ? BRAND.purpleSoft : BRAND.pink,
        }}
      >
        {added ? (
          <>
            <Check size={15} color={BRAND.purple} strokeWidth={2.5} />
            <Text
              className="text-sm"
              style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
            >
              added
            </Text>
          </>
        ) : (
          <>
            <Plus size={15} color="#fff" strokeWidth={2.5} />
            <Text
              className="text-sm"
              style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#fff' }}
            >
              book this
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function EstimateLine({ label, range }: { label: string; range: CostRange }) {
  return (
    <View className="flex-row items-baseline justify-between pt-1">
      <Text
        className="text-sm"
        style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
      >
        {label}
      </Text>
      <Text className="text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
        {formatRange(range)}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="pt-3 text-xs"
      style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.pink, letterSpacing: 0.5 }}
    >
      {children}
    </Text>
  );
}

const INITIAL_VISIBLE = 2;

function ShowMoreLink({
  expanded,
  hiddenCount,
  onToggle,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
}) {
  if (!expanded && hiddenCount <= 0) return null;
  return (
    <Pressable onPress={onToggle} hitSlop={8} className="self-start py-2">
      <Text
        className="text-sm"
        style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
      >
        {expanded ? 'show less' : `show ${hiddenCount} more option${hiddenCount === 1 ? '' : 's'}`}
      </Text>
    </Pressable>
  );
}

export default function BookScreen() {
  const router = useRouter();
  const {
    estimate: estimateParam,
    startDate,
    endDate,
    departureCity,
    travellers,
  } = useLocalSearchParams();

  const start = Array.isArray(startDate) ? startDate[0] : (startDate ?? '');
  const end = Array.isArray(endDate) ? endDate[0] : (endDate ?? '');
  const departure = Array.isArray(departureCity) ? departureCity[0] : (departureCity ?? '');
  const travellerCount = Array.isArray(travellers) ? travellers[0] : (travellers ?? '1');

  const estimate = useMemo<TripEstimate | null>(() => {
    if (!estimateParam) return null;
    try {
      const raw = Array.isArray(estimateParam) ? estimateParam[0] : estimateParam;
      const parsed: unknown = JSON.parse(raw);
      return isTripEstimate(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [estimateParam]);

  const options = useMemo<BookableOption[]>(() => {
    if (!estimate) return [];
    return buildOptions(estimate.cities);
  }, [estimate]);

  const legs = useMemo<TravelLeg[]>(() => estimate?.legs ?? [], [estimate]);

  const cityNames = useMemo<string[]>(() => estimate?.cities.map((c) => c.name) ?? [], [estimate]);

  // The incoming leg for a city is the one that arrives there (leg.to === city).
  const legByCity = useMemo<Record<string, TravelLeg | undefined>>(() => {
    const map: Record<string, TravelLeg | undefined> = {};
    for (const leg of legs) map[leg.to] = leg;
    return map;
  }, [legs]);

  const [activeCity, setActiveCity] = useState<string>('');

  // Keep the active tab valid as the estimate (and its cities) load/change.
  useEffect(() => {
    if (cityNames.length === 0) return;
    if (!cityNames.includes(activeCity)) setActiveCity(cityNames[0]);
  }, [cityNames, activeCity]);

  const [added, setAdded] = useState<Record<string, boolean>>({});
  // One selected travel option per leg (single-select). Maps legId -> optionId.
  const [legChoice, setLegChoice] = useState<Record<string, string>>({});
  // Which sections have "show more" expanded. Keyed by a stable section id.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (sectionId: string) => {
    setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggle = (option: BookableOption) => {
    setAdded((prev) => {
      const next = !prev[option.id];
      return { ...prev, [option.id]: next };
    });
  };

  const selectLeg = (leg: TravelLeg, option: TravelOption) => {
    setLegChoice((prev) => {
      // Tapping the selected option again clears it.
      const next = prev[leg.id] === option.id ? undefined : option.id;
      const updated = { ...prev };
      if (next) updated[leg.id] = next;
      else delete updated[leg.id];
      return updated;
    });
  };

  // Booked total: selected legs + accommodation selections (concrete prices).
  const bookedTotal = useMemo<number>(() => {
    const stayTotal = options.reduce((sum, opt) => (added[opt.id] ? sum + opt.price : sum), 0);
    const legTotal = legs.reduce((sum, leg) => {
      const chosen = leg.options.find((o) => o.id === legChoice[leg.id]);
      return chosen ? sum + chosen.price : sum;
    }, 0);
    return stayTotal + legTotal;
  }, [options, added, legs, legChoice]);

  // Every booked item, in trip order, for the review screen.
  const bookedItems = useMemo<BookedItem[]>(() => {
    if (!estimate) return [];
    const out: BookedItem[] = [];
    const catLabel: Record<BookableCategory, BookedItem['category']> = {
      accommodation: 'hotel',
      food: 'restaurant',
      activities: 'activity',
    };
    for (const city of estimate.cities) {
      const incoming = legByCity[city.name];
      if (incoming) {
        const chosen = incoming.options.find((o) => o.id === legChoice[incoming.id]);
        if (chosen) {
          out.push({
            city: city.name,
            category: chosen.mode === 'train' ? 'train' : 'flight',
            title: `${incoming.from} → ${incoming.to}`,
            detail: `${chosen.carrier} · ${chosen.detail}`,
            price: chosen.price,
          });
        }
      }
      for (const opt of options) {
        if (opt.city === city.name && added[opt.id]) {
          out.push({
            city: city.name,
            category: catLabel[opt.category],
            title: opt.title,
            detail: opt.detail,
            price: opt.price,
          });
        }
      }
    }
    return out;
  }, [estimate, options, added, legByCity, legChoice]);

  // Review unlocks once every city has at least one booked item (any category).
  const reviewReady = useMemo<boolean>(() => {
    if (cityNames.length === 0) return false;
    const booked = new Set(bookedItems.map((i) => i.city));
    return cityNames.every((name) => booked.has(name));
  }, [cityNames, bookedItems]);

  // Standing food + activities estimate across all cities.
  const estimateExtra = useMemo<CostRange>(() => {
    if (!estimate) return { min: 0, max: 0 };
    return estimate.cities.reduce<CostRange>(
      (acc, city) => ({
        min: acc.min + city.breakdown.food.min + city.breakdown.activities.min,
        max: acc.max + city.breakdown.food.max + city.breakdown.activities.max,
      }),
      { min: 0, max: 0 },
    );
  }, [estimate]);

  const addedCount = options.filter((o) => added[o.id]).length + Object.keys(legChoice).length;
  const dateLabel = formatDates(start, end);

  if (!estimate) {
    return (
      <View
        className="pt-safe-offset-2 flex-1 items-center justify-center gap-4 px-6"
        style={{ backgroundColor: '#fafafa' }}
      >
        <Text className="text-xl" style={{ fontFamily: BODY_FONT, fontWeight: '700' }}>
          nothing to book yet
        </Text>
        <Text style={{ fontFamily: BODY_FONT, color: '#6b6b6b', textAlign: 'center' }}>
          {"head back and plan a trip first, then we'll line up the deals."}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.pink }}>
            back to breakdown
          </Text>
        </Pressable>
      </View>
    );
  }

  const cityList = estimate.cities.map((c) => c.name).join(', ');

  return (
    <View className="flex-1" style={{ backgroundColor: '#fafafa' }}>
      <View className="pt-safe-offset-2 px-5">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 self-start py-2"
          hitSlop={8}
        >
          <ArrowLeft size={18} color={BRAND.purple} />
          <Text
            className="text-sm"
            style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
          >
            back to breakdown
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-1 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-3xl"
          style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#1a1a1a' }}
        >
          book your trip
        </Text>

        {/* Trip summary */}
        <Surface className="gap-3 p-5" style={{ backgroundColor: '#fff', borderRadius: 18 }}>
          <View>
            <Text
              className="text-xs"
              style={{
                fontFamily: BODY_FONT,
                fontWeight: '600',
                color: BRAND.pink,
                letterSpacing: 0.6,
              }}
            >
              YOUR TRIP
            </Text>
            <Text
              className="mt-1 text-lg"
              style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
            >
              {cityList}
            </Text>
            {dateLabel ? (
              <Text className="mt-0.5 text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
                {dateLabel}
              </Text>
            ) : null}
          </View>
          <View className="h-px" style={{ backgroundColor: '#eee' }} />
          <View>
            <Text className="text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
              estimated total
            </Text>
            <Text
              className="mt-0.5 text-2xl"
              style={{ fontFamily: BODY_FONT, fontWeight: '700', color: BRAND.purple }}
            >
              {formatRange(estimate.totalCost)}
            </Text>
          </View>
        </Surface>

        {/* Route efficiency callout */}
        {estimate.routeWarning ? (
          <Surface
            className="flex-row items-start gap-3 p-4"
            style={{ backgroundColor: BRAND.pinkSoft, borderRadius: 16 }}
          >
            <AlertTriangle
              size={18}
              color={BRAND.pink}
              strokeWidth={2.2}
              style={{ marginTop: 1 }}
            />
            <Text
              className="flex-1 text-sm"
              style={{ fontFamily: BODY_FONT, color: '#1a1a1a', lineHeight: 20 }}
            >
              {estimate.routeWarning}
            </Text>
          </Surface>
        ) : null}

        {/* City tabs — one shared bar covering leg + accommodation + food + activities */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {estimate.cities.map((city) => {
            const isActive = city.name === activeCity;
            return (
              <Pressable
                key={city.name}
                onPress={() => setActiveCity(city.name)}
                hitSlop={6}
                className="rounded-full px-4 py-2.5"
                style={{
                  backgroundColor: isActive ? BRAND.purple : '#fff',
                  borderWidth: 1,
                  borderColor: isActive ? BRAND.purple : '#eee',
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: '600',
                    color: isActive ? '#fff' : '#6b6b6b',
                  }}
                >
                  {city.name.toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active city content: its incoming leg, accommodation, food, activities */}
        {(() => {
          const city = estimate.cities.find((c) => c.name === activeCity);
          if (!city) return null;

          const stayOpts = options.filter(
            (o) => o.city === city.name && o.category === 'accommodation',
          );
          const foodOpts = options.filter((o) => o.city === city.name && o.category === 'food');
          const actOpts = options.filter(
            (o) => o.city === city.name && o.category === 'activities',
          );
          const leg = legByCity[city.name];

          const renderOptionList = (
            opts: BookableOption[],
            sectionId: string,
            leadingDivider: boolean,
          ) => {
            const isExpanded = expanded[sectionId];
            const visible = isExpanded ? opts : opts.slice(0, INITIAL_VISIBLE);
            const hiddenCount = opts.length - visible.length;
            return (
              <>
                {visible.map((opt, idx) => (
                  <View key={opt.id}>
                    {leadingDivider || idx > 0 ? (
                      <View className="h-px" style={{ backgroundColor: '#f0f0f0' }} />
                    ) : null}
                    <OptionRow option={opt} added={added[opt.id]} onToggle={() => toggle(opt)} />
                  </View>
                ))}
                <ShowMoreLink
                  expanded={isExpanded}
                  hiddenCount={hiddenCount}
                  onToggle={() => toggleExpanded(sectionId)}
                />
              </>
            );
          };

          return (
            <View className="gap-4">
              {/* Getting here — this city's incoming leg */}
              {leg
                ? (() => {
                    const sectionId = `leg-${leg.id}`;
                    const isExpanded = expanded[sectionId];
                    const visibleOpts = isExpanded
                      ? leg.options
                      : leg.options.slice(0, INITIAL_VISIBLE);
                    const hiddenCount = leg.options.length - visibleOpts.length;
                    return (
                      <Surface
                        className="px-5 pb-3"
                        style={{ backgroundColor: '#fff', borderRadius: 18 }}
                      >
                        <Text
                          className="pt-4 text-lg"
                          style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#1a1a1a' }}
                        >
                          getting here
                        </Text>
                        <Text
                          className="pt-2 text-base"
                          style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
                        >
                          {leg.from.toLowerCase()} → {leg.to.toLowerCase()}
                        </Text>
                        {visibleOpts.map((opt, idx) => (
                          <View key={opt.id}>
                            {idx > 0 ? (
                              <View className="h-px" style={{ backgroundColor: '#f0f0f0' }} />
                            ) : null}
                            <LegOptionRow
                              option={opt}
                              selected={legChoice[leg.id] === opt.id}
                              onSelect={() => selectLeg(leg, opt)}
                            />
                          </View>
                        ))}
                        <ShowMoreLink
                          expanded={isExpanded}
                          hiddenCount={hiddenCount}
                          onToggle={() => toggleExpanded(sectionId)}
                        />
                      </Surface>
                    );
                  })()
                : null}

              {/* Accommodation / food / activities for this city */}
              <Surface className="px-5 pb-3" style={{ backgroundColor: '#fff', borderRadius: 18 }}>
                <SectionLabel>ACCOMMODATION</SectionLabel>
                {renderOptionList(stayOpts, `${city.name}-accommodation`, false)}

                <SectionLabel>FOOD</SectionLabel>
                <EstimateLine label="estimated spend" range={city.breakdown.food} />
                {renderOptionList(foodOpts, `${city.name}-food`, true)}

                <SectionLabel>ACTIVITIES</SectionLabel>
                <EstimateLine label="estimated spend" range={city.breakdown.activities} />
                {renderOptionList(actOpts, `${city.name}-activities`, true)}
              </Surface>
            </View>
          );
        })()}
      </ScrollView>

      {/* Running total + commission note */}
      <View
        className="pb-safe-offset-3 gap-1 px-5 pt-4"
        style={{ borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }}
      >
        {reviewReady ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/review',
                params: {
                  items: JSON.stringify(bookedItems),
                  total: String(bookedTotal),
                  startDate: start,
                  endDate: end,
                  departureCity: departure,
                  travellers: travellerCount,
                  cities: JSON.stringify(cityNames),
                },
              })
            }
            className="mb-2 flex-row items-center justify-center gap-2 rounded-full py-3.5"
            style={{ backgroundColor: BRAND.purple }}
          >
            <Text
              className="text-base"
              style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
            >
              review your trip
            </Text>
            <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
          </Pressable>
        ) : null}
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-base"
            style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
          >
            booked so far
          </Text>
          <Text
            className="text-lg"
            style={{ fontFamily: BODY_FONT, fontWeight: '700', color: BRAND.pink }}
          >
            {formatMoney(bookedTotal)}
          </Text>
        </View>
        <Text className="text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
          {addedCount > 0
            ? `${addedCount} ${addedCount === 1 ? 'thing' : 'things'} lined up — figure ~${formatRange(estimateExtra)} for food & activities across the trip`
            : `figure ~${formatRange(estimateExtra)} for food & activities across the trip`}
        </Text>
        <Text className="mt-1 text-xs" style={{ fontFamily: BODY_FONT, color: '#9a9a9a' }}>
          bilt-budget earns a small commission when you book through us — never more than you&apos;d
          pay anyway.
        </Text>
      </View>
    </View>
  );
}
