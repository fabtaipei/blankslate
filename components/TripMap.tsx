import { addDays, format } from 'date-fns';
import { Surface, Text } from 'heroui-native';
import { MapPin, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import MapView from '@/components/MapView';
import type { LatLng, MapMarker, MapRegion } from '@/components/MapView';
import { getCityCoords } from '@/lib/cities';

// bilt.me brand palette — keep map markers/route on-brand.
const BRAND_PURPLE = '#6320EE';
const BRAND_PINK = '#CD1A6F';

export interface ItineraryStop {
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
export function buildStops(
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

export function TripMap({
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
        <View className="mt-1 gap-2.5">
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
