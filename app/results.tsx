import { addDays, format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Surface, Tabs, Text, useThemeColor } from 'heroui-native';
import { ArrowLeft, MapPin, Plane, Train, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import MapView from '@/components/MapView';
import type { LatLng, MapMarker, MapRegion } from '@/components/MapView';
import { getCityCoords } from '@/lib/cities';
import type { CityEstimate, CostRange, TravelLeg, TripEstimate } from '@/lib/tripEstimate';

// bilt.me brand palette — keep map markers/route on-brand.
const BRAND_PURPLE = '#6320EE';
const BRAND_PINK = '#CD1A6F';

function formatMoney(value: number): string {
  return `£${Math.round(value).toLocaleString('en-GB')}`;
}

function formatRange(range: CostRange): string {
  return `${formatMoney(range.min)} – ${formatMoney(range.max)}`;
}

const BREAKDOWN_ROWS: { key: keyof CityEstimate['breakdown']; label: string }[] = [
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'food', label: 'Food' },
  { key: 'activities', label: 'Activities' },
];

function BreakdownRow({ label, range }: { label: string; range: CostRange }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm" color="muted">
        {label}
      </Text>
      <Text className="text-base font-semibold">{formatRange(range)}</Text>
    </View>
  );
}

function CityCard({ city }: { city: CityEstimate }) {
  return (
    <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
      <View className="mb-3 flex-row items-end justify-between">
        <Text className="flex-1 pr-3 text-2xl font-bold tracking-tight" numberOfLines={1}>
          {city.name}
        </Text>
        <Text className="text-brand-purple text-xl font-bold">{formatRange(city.costRange)}</Text>
      </View>
      <Separator />
      <View className="mt-1">
        {BREAKDOWN_ROWS.map((row) => (
          <BreakdownRow key={row.key} label={row.label} range={city.breakdown[row.key]} />
        ))}
      </View>
    </Surface>
  );
}

function legRange(leg: TravelLeg): CostRange {
  const prices = leg.options.map((o) => o.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function TravelCard({ legs }: { legs: TravelLeg[] }) {
  return (
    <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
      <Text className="mb-3 text-lg font-bold tracking-tight">Getting around</Text>
      <Separator />
      <View className="mt-2 gap-1">
        {legs.map((leg) => {
          const hasTrain = leg.options.some((o) => o.mode === 'train');
          const range = legRange(leg);
          return (
            <View key={leg.id} className="flex-row items-center justify-between py-1.5">
              <View className="flex-1 flex-row items-center gap-2.5 pr-3">
                <View className="bg-brand-purple-soft h-7 w-7 items-center justify-center rounded-full">
                  {hasTrain ? (
                    <Train size={15} color="#6320EE" strokeWidth={2.2} />
                  ) : (
                    <Plane size={15} color="#6320EE" strokeWidth={2.2} />
                  )}
                </View>
                <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
                  {leg.from} → {leg.to}
                </Text>
              </View>
              <Text className="text-sm font-semibold">{formatRange(range)}</Text>
            </View>
          );
        })}
      </View>
    </Surface>
  );
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

// ---------------------------------------------------------------------------
// Itinerary map helpers
// ---------------------------------------------------------------------------

interface ItineraryStop {
  /** Stable unique key for this stop (name + position). */
  id: string;
  /** Display name of the city. */
  name: string;
  /** True for the departure city (start of the trip). */
  isDeparture: boolean;
  coordinate: LatLng;
  /** Friendly date-range label for this stop, or null when unknown. */
  dateLabel: string | null;
}

function safeDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a single day or an inclusive range as "Mar 3" / "Mar 3 – Mar 6". */
function rangeLabel(start: Date, days: number): string {
  if (days <= 1) return format(start, 'MMM d');
  const end = addDays(start, days - 1);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

/**
 * Build the ordered list of itinerary stops with coordinates and per-city date
 * windows. The departure city is day 0; each city's window follows on from the
 * running day total, using the per-city duration split from the planner.
 */
function buildStops(
  departureCity: string,
  cities: string[],
  durations: number[],
  startISO: string,
): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  const start = safeDate(startISO);

  const departure = departureCity.trim();
  if (departure) {
    stops.push({
      id: `${departure}-0`,
      name: departure,
      isDeparture: true,
      coordinate: getCityCoords(departure),
      dateLabel: start ? `Departs ${format(start, 'MMM d')}` : null,
    });
  }

  let dayCursor = 0;
  cities.forEach((city, index) => {
    const days = Math.max(1, Math.round(durations[index] ?? 1));
    const cityStart = start ? addDays(start, dayCursor) : null;
    stops.push({
      id: `${city}-${index + 1}`,
      name: city,
      isDeparture: false,
      coordinate: getCityCoords(city),
      dateLabel: cityStart ? rangeLabel(cityStart, days) : null,
    });
    dayCursor += days;
  });

  return stops;
}

/** A region that comfortably frames every stop, with sane min/max padding. */
function regionForStops(stops: ItineraryStop[]): MapRegion {
  if (stops.length === 0) {
    return { latitude: 20, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 };
  }

  const lats = stops.map((s) => s.coordinate.latitude);
  const lngs = stops.map((s) => s.coordinate.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  // Pad the span by 60% so markers aren't flush against the edges.
  const latitudeDelta = Math.min(160, Math.max(2, (maxLat - minLat) * 1.6 || 4));
  const longitudeDelta = Math.min(320, Math.max(2, (maxLng - minLng) * 1.6 || 4));

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

function TripMap({
  departureCity,
  cities,
  durations,
  startDate,
}: {
  departureCity: string;
  cities: string[];
  durations: number[];
  startDate: string;
}) {
  const [selected, setSelected] = useState<ItineraryStop | null>(null);

  const stops = useMemo(
    () => buildStops(departureCity, cities, durations, startDate),
    [departureCity, cities, durations, startDate],
  );

  const region = useMemo(() => regionForStops(stops), [stops]);

  const markers = useMemo<MapMarker[]>(
    () =>
      stops.map((stop) => ({
        id: stop.id,
        coordinate: stop.coordinate,
        // All pins use the brand purple preset; departure is set apart by the
        // route start badge and the "Start" tag in its popup.
        color: 'purple' as const,
      })),
    [stops],
  );

  const polylines = useMemo(
    () =>
      stops.length > 1
        ? [
            {
              id: 'itinerary-route',
              coordinates: stops.map((s) => s.coordinate),
              strokeColor: BRAND_PINK,
              strokeWidth: 3.5,
            },
          ]
        : [],
    [stops],
  );

  return (
    <View className="gap-4">
      <Surface className="overflow-hidden rounded-3xl p-0">
        <View className="relative">
          <MapView
            style={{ height: 360, width: '100%' }}
            initialRegion={region}
            region={region}
            markers={markers}
            polylines={polylines}
            onMarkerPress={(m) => {
              const next = stops.find((s) => s.id === m.id);
              setSelected(next ?? null);
            }}
            scrollEnabled
            zoomEnabled
          />

          {selected ? (
            <View className="absolute inset-x-3 top-3">
              <Surface className="border-border/60 flex-row items-start justify-between gap-3 rounded-2xl border p-3.5">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <MapPin size={14} color={selected.isDeparture ? BRAND_PINK : BRAND_PURPLE} />
                    <Text className="text-base font-bold" numberOfLines={1}>
                      {selected.name}
                    </Text>
                    {selected.isDeparture ? (
                      <View className="bg-brand-purple-soft rounded-full px-2 py-0.5">
                        <Text className="text-brand-purple text-[10px] font-bold tracking-wide uppercase">
                          Start
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-0.5 text-sm" color="muted">
                    {selected.dateLabel ?? 'Dates not set'}
                  </Text>
                </View>
                <Pressable onPress={() => setSelected(null)} hitSlop={8} className="pt-0.5">
                  <X size={18} color={BRAND_PURPLE} />
                </Pressable>
              </Surface>
            </View>
          ) : null}
        </View>
      </Surface>

      <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
        <Text className="mb-1 text-lg font-bold tracking-tight">Your route</Text>
        <Text className="mb-3 text-sm" color="muted">
          Tap a pin to see the dates for that stop.
        </Text>
        <Separator />
        <View className="mt-3 gap-2.5">
          {stops.map((stop, index) => (
            <Pressable
              key={stop.id}
              onPress={() => setSelected(stop)}
              className="flex-row items-center gap-3"
            >
              <View
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: stop.isDeparture ? BRAND_PINK : BRAND_PURPLE }}
              >
                <Text className="text-xs font-bold" style={{ color: '#ffffff' }}>
                  {stop.isDeparture ? '✈' : index}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold" numberOfLines={1}>
                  {stop.name}
                </Text>
                {stop.dateLabel ? (
                  <Text className="text-xs" color="muted">
                    {stop.dateLabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </Surface>
    </View>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const {
    estimate: estimateParam,
    startDate,
    endDate,
    departureCity,
    travellers,
    cityDurations: cityDurationsParam,
  } = useLocalSearchParams();
  const [accent] = useThemeColor(['accent']);
  const [view, setView] = useState<'breakdown' | 'map'>('breakdown');

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

  const startISO = Array.isArray(startDate) ? startDate[0] : (startDate ?? '');
  const departureName = Array.isArray(departureCity) ? departureCity[0] : (departureCity ?? '');

  const durations = useMemo<number[]>(() => {
    if (!cityDurationsParam) return [];
    try {
      const raw = Array.isArray(cityDurationsParam) ? cityDurationsParam[0] : cityDurationsParam;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((n) => Number(n) || 1) : [];
    } catch {
      return [];
    }
  }, [cityDurationsParam]);

  if (!estimate) {
    return (
      <View className="bg-background p-safe flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-xl font-bold" align="center">
          No estimate to show
        </Text>
        <Text color="muted" align="center">
          Head back and plan a trip to see your cost breakdown.
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          Back to planner
        </Button>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <View className="pt-safe-offset-2 px-5">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 self-start py-2"
          hitSlop={8}
        >
          <ArrowLeft size={20} color={accent} />
          <Text className="text-brand-purple text-base font-semibold">Back</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 pb-6 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <Surface className="items-center gap-1.5 rounded-3xl p-7">
          <Text className="text-brand-purple text-xs font-bold tracking-widest uppercase">
            Estimated total
          </Text>
          <Text className="text-5xl font-bold tracking-tight" align="center">
            {formatRange(estimate.totalCost)}
          </Text>
          <View className="bg-brand-purple-soft mt-1 rounded-full px-3 py-1">
            <Text className="text-brand-purple text-xs font-semibold">
              {estimate.cities.length} {estimate.cities.length === 1 ? 'city' : 'cities'}
            </Text>
          </View>
        </Surface>

        <Tabs value={view} onValueChange={(v) => setView(v === 'map' ? 'map' : 'breakdown')}>
          <Tabs.List>
            <Tabs.Indicator />
            <Tabs.Trigger value="breakdown">
              <Tabs.Label>Breakdown</Tabs.Label>
            </Tabs.Trigger>
            <Tabs.Trigger value="map">
              <Tabs.Label>Map</Tabs.Label>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>

        {view === 'breakdown' ? (
          <View className="gap-4">
            {estimate.legs.length > 0 ? <TravelCard legs={estimate.legs} /> : null}
            {estimate.cities.map((city) => (
              <CityCard key={city.name} city={city} />
            ))}
          </View>
        ) : (
          <TripMap
            departureCity={departureName}
            cities={estimate.cities.map((c) => c.name)}
            durations={durations}
            startDate={startISO}
          />
        )}
      </ScrollView>

      <View className="border-border bg-background pb-safe-offset-3 border-t px-5 pt-3">
        <Button
          variant="primary"
          size="lg"
          onPress={() =>
            router.push({
              pathname: '/book',
              params: {
                estimate: JSON.stringify(estimate),
                startDate: Array.isArray(startDate) ? startDate[0] : (startDate ?? ''),
                endDate: Array.isArray(endDate) ? endDate[0] : (endDate ?? ''),
                departureCity: Array.isArray(departureCity)
                  ? departureCity[0]
                  : (departureCity ?? ''),
                travellers: Array.isArray(travellers) ? travellers[0] : (travellers ?? '1'),
              },
            })
          }
        >
          Book this trip
        </Button>
      </View>
    </View>
  );
}
