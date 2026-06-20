import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Separator, Surface, Tabs, Text, useThemeColor } from 'heroui-native';
import { ArrowLeft, Plane, Train } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { TripMap } from '@/components/TripMap';
import {
  cityDateRanges,
  formatCityDateRange,
  type CityEstimate,
  type CostRange,
  type TravelLeg,
  type TripEstimate,
} from '@/lib/tripEstimate';

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

function CityCard({ city, dateLabel }: { city: CityEstimate; dateLabel?: string }) {
  return (
    <Surface variant="secondary" className="border-border/60 rounded-3xl border p-5">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-extrabold tracking-tight" numberOfLines={1}>
            {city.name}
          </Text>
          {dateLabel ? (
            <Text className="text-brand-pink mt-0.5 text-xs font-bold lowercase">{dateLabel}</Text>
          ) : null}
        </View>
        <Text className="text-brand-purple text-xl font-extrabold">
          {formatRange(city.costRange)}
        </Text>
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
      <Text className="mb-3 text-lg font-extrabold tracking-tight">getting around</Text>
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

  const cityDurationsStr = Array.isArray(cityDurationsParam)
    ? (cityDurationsParam[0] ?? '')
    : (cityDurationsParam ?? '');

  const dateRanges = useMemo(
    () => cityDateRanges(startISO, durations, estimate?.cities.length ?? 0),
    [startISO, durations, estimate],
  );

  if (!estimate) {
    return (
      <View className="bg-background p-safe flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-xl font-extrabold" align="center">
          nothing to show yet
        </Text>
        <Text color="muted" align="center">
          head back and plan a trip to see your cost breakdown.
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          back to planner
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
          <Text className="text-brand-purple text-base font-bold">back</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 pb-6 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#6320EE', '#CD1A6F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            alignItems: 'center',
            gap: 6,
            borderRadius: 30,
            paddingVertical: 30,
            paddingHorizontal: 24,
          }}
        >
          <Text
            className="text-sm font-extrabold lowercase"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            here&apos;s the damage
          </Text>
          <Text
            className="text-5xl font-extrabold tracking-tight"
            align="center"
            style={{ color: '#fff' }}
          >
            {formatRange(estimate.totalCost)}
          </Text>
          <View
            className="mt-1 rounded-full px-3 py-1"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text className="text-xs font-bold" style={{ color: '#fff' }}>
              {estimate.cities.length} {estimate.cities.length === 1 ? 'city' : 'cities'}
            </Text>
          </View>
        </LinearGradient>

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
            {estimate.cities.map((city, index) => (
              <CityCard
                key={city.name}
                city={city}
                dateLabel={formatCityDateRange(
                  dateRanges[index] ?? { startISO: null, endISO: null, days: [] },
                  durations[index] ?? 1,
                )}
              />
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
                cityDurations: cityDurationsStr,
              },
            })
          }
        >
          let&apos;s book it
        </Button>
      </View>
    </View>
  );
}
