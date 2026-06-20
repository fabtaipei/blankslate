import { addDays, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Separator, Surface, Tabs, Text } from 'heroui-native';
import { Bed, CalendarDays, MapPin, Plane, Ticket, Train, Utensils } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { TripMap } from '@/components/TripMap';
import { useSavedTrip } from '@/lib/savedTrip';
import type { BookedItem } from '@/lib/tripEstimate';

const BRAND_PURPLE = '#6320EE';
const BRAND_PINK = '#CD1A6F';

function formatMoney(value: number): string {
  return `£${Math.round(value).toLocaleString('en-GB')}`;
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

function safeDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const CATEGORY_ICON: Record<BookedItem['category'], typeof Plane> = {
  flight: Plane,
  train: Train,
  hotel: Bed,
  restaurant: Utensils,
  activity: Ticket,
};

function ItemRow({ item }: { item: BookedItem }) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(99, 32, 238, 0.10)' }}
      >
        <Icon size={17} color={BRAND_PURPLE} strokeWidth={2} />
      </View>
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="mt-0.5 text-sm" color="muted">
          {item.category} · {item.detail}
        </Text>
      </View>
      <Text className="text-base font-bold">{formatMoney(item.price)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Day-by-day calendar
// ---------------------------------------------------------------------------

interface CalendarDay {
  /** 1-based day number within the trip. */
  dayNumber: number;
  /** Formatted date for this day, or null if dates are unknown. */
  dateLabel: string | null;
  /** Weekday, e.g. "Mon". */
  weekday: string | null;
  /** City the traveller is in on this day. */
  city: string;
  /** True on the first day in a given city (used to draw a heading divider). */
  isCityStart: boolean;
}

/**
 * Map every day of the trip to the city the traveller is in. The departure city
 * is treated as the start; each destination then runs for its allotted days.
 */
function buildCalendar(cities: string[], durations: number[], startISO: string): CalendarDay[] {
  const start = safeDate(startISO);
  const days: CalendarDay[] = [];
  let dayCursor = 0;

  cities.forEach((city, cityIndex) => {
    const count = Math.max(1, Math.round(durations[cityIndex] ?? 1));
    for (let i = 0; i < count; i++) {
      const date = start ? addDays(start, dayCursor) : null;
      days.push({
        dayNumber: dayCursor + 1,
        dateLabel: date ? format(date, 'MMM d') : null,
        weekday: date ? format(date, 'EEE') : null,
        city,
        isCityStart: i === 0,
      });
      dayCursor += 1;
    }
  });

  return days;
}

function CalendarView({
  cities,
  durations,
  startDate,
}: {
  cities: string[];
  durations: number[];
  startDate: string;
}) {
  const calendar = useMemo(
    () => buildCalendar(cities, durations, startDate),
    [cities, durations, startDate],
  );

  if (calendar.length === 0) {
    return (
      <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
        <Text color="muted">No day-by-day plan available for this trip.</Text>
      </Surface>
    );
  }

  return (
    <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
      <View className="mb-1 flex-row items-center gap-2">
        <CalendarDays size={18} color={BRAND_PURPLE} strokeWidth={2.2} />
        <Text className="text-lg font-extrabold tracking-tight">day by day</Text>
      </View>
      <Text className="mb-3 text-sm" color="muted">
        where you are each day of the trip.
      </Text>
      <Separator />
      <View className="mt-2">
        {calendar.map((day, index) => (
          <View key={`${day.dayNumber}-${day.city}`}>
            {day.isCityStart && index > 0 ? (
              <View className="my-1 h-px" style={{ backgroundColor: '#f0f0f0' }} />
            ) : null}
            <View className="flex-row items-center gap-3 py-2">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: day.isCityStart ? BRAND_PINK : 'rgba(99, 32, 238, 0.10)',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: day.isCityStart ? '#fff' : BRAND_PURPLE }}
                >
                  {day.dayNumber}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold" numberOfLines={1}>
                  {day.city}
                </Text>
                {day.dateLabel ? (
                  <Text className="text-xs" color="muted">
                    {day.weekday} · {day.dateLabel}
                  </Text>
                ) : (
                  <Text className="text-xs" color="muted">
                    Day {day.dayNumber}
                  </Text>
                )}
              </View>
              {day.isCityStart ? (
                <View className="bg-brand-purple-soft rounded-full px-2.5 py-1">
                  <Text className="text-brand-purple text-[11px] font-bold uppercase">arrive</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Itinerary (booked items grouped by city)
// ---------------------------------------------------------------------------

function ItineraryView({ cities, items }: { cities: string[]; items: BookedItem[] }) {
  const grouped = useMemo(() => {
    const order = cities.length > 0 ? cities : [...new Set(items.map((i) => i.city))];
    return order
      .map((city) => ({ city, items: items.filter((i) => i.city === city) }))
      .filter((g) => g.items.length > 0);
  }, [cities, items]);

  if (grouped.length === 0) {
    return (
      <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
        <Text color="muted">Nothing booked yet for this trip.</Text>
      </Surface>
    );
  }

  return (
    <View className="gap-4">
      {grouped.map((group) => {
        const cityTotal = group.items.reduce((sum, i) => sum + i.price, 0);
        return (
          <Surface
            key={group.city}
            variant="secondary"
            className="border-border/60 rounded-3xl border px-5 pb-3"
          >
            <View className="flex-row items-center justify-between pt-4 pb-1">
              <Text
                className="text-xs font-bold tracking-wide uppercase"
                style={{ color: BRAND_PINK }}
              >
                {group.city}
              </Text>
              <Text className="text-sm font-semibold" color="muted">
                {formatMoney(cityTotal)}
              </Text>
            </View>
            {group.items.map((item, idx) => (
              <View key={item.title}>
                {idx > 0 ? <View className="h-px" style={{ backgroundColor: '#f0f0f0' }} /> : null}
                <ItemRow item={item} />
              </View>
            ))}
          </Surface>
        );
      })}
    </View>
  );
}

type TripTab = 'itinerary' | 'map' | 'calendar';

export default function MyTripScreen() {
  const router = useRouter();
  const { trip, hydrated } = useSavedTrip();
  const [view, setView] = useState<TripTab>('itinerary');

  if (!hydrated) {
    return <View className="bg-background flex-1" />;
  }

  if (!trip) {
    return (
      <View className="bg-background pt-safe-offset-6 flex-1 items-center justify-center gap-4 px-8">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(99, 32, 238, 0.10)' }}
        >
          <MapPin size={30} color={BRAND_PURPLE} strokeWidth={2.2} />
        </View>
        <Text className="text-2xl font-extrabold" align="center">
          no trip yet
        </Text>
        <Text color="muted" align="center">
          plan and book a trip and it&apos;ll live here — itinerary, map, and day-by-day, all in one
          spot.
        </Text>
        <Button variant="primary" onPress={() => router.replace('/(tabs)')}>
          plan a trip
        </Button>
      </View>
    );
  }

  const dateLabel = formatDates(trip.startDate, trip.endDate);

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-safe-offset-4 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <LinearGradient
          colors={['#6320EE', '#CD1A6F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ gap: 12, borderRadius: 30, padding: 24 }}
        >
          <Text
            className="text-xs font-extrabold lowercase"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            your trip, sorted
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
            {trip.departureCity ? (
              <Text className="text-2xl font-extrabold tracking-tight" style={{ color: '#fff' }}>
                {trip.departureCity}
              </Text>
            ) : null}
            {trip.cities.map((city) => (
              <View key={city} className="flex-row items-center gap-1.5">
                <Text className="text-2xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  →
                </Text>
                <Text className="text-2xl font-extrabold tracking-tight" style={{ color: '#fff' }}>
                  {city}
                </Text>
              </View>
            ))}
          </View>
          <View className="h-px" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <View className="flex-row items-end justify-between">
            <View>
              {dateLabel ? (
                <Text className="text-sm font-bold" style={{ color: '#fff' }}>
                  {dateLabel}
                </Text>
              ) : null}
              <Text className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'}
              </Text>
            </View>
            <View className="items-end">
              <Text
                className="text-xs font-bold uppercase"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Total
              </Text>
              <Text className="text-3xl font-extrabold" style={{ color: '#fff' }}>
                {formatMoney(trip.total)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <Tabs
          value={view}
          onValueChange={(v) =>
            setView(v === 'map' ? 'map' : v === 'calendar' ? 'calendar' : 'itinerary')
          }
        >
          <Tabs.List>
            <Tabs.Indicator />
            <Tabs.Trigger value="itinerary">
              <Tabs.Label>Itinerary</Tabs.Label>
            </Tabs.Trigger>
            <Tabs.Trigger value="map">
              <Tabs.Label>Map</Tabs.Label>
            </Tabs.Trigger>
            <Tabs.Trigger value="calendar">
              <Tabs.Label>Calendar</Tabs.Label>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>

        {view === 'itinerary' ? (
          <ItineraryView cities={trip.cities} items={trip.items} />
        ) : view === 'map' ? (
          <TripMap
            departureCity={trip.departureCity}
            cities={trip.cities}
            durations={trip.cityDurations}
            startDate={trip.startDate}
          />
        ) : (
          <CalendarView
            cities={trip.cities}
            durations={trip.cityDurations}
            startDate={trip.startDate}
          />
        )}

        <Button variant="secondary" onPress={() => router.replace('/(tabs)')}>
          plan another trip
        </Button>
      </ScrollView>
    </View>
  );
}
