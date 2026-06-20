import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Surface, Text, useThemeColor } from 'heroui-native';
import { ArrowLeft, Plane, Train } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { CityEstimate, CostRange, TravelLeg, TripEstimate } from '@/lib/tripEstimate';

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

export default function ResultsScreen() {
  const router = useRouter();
  const {
    estimate: estimateParam,
    startDate,
    endDate,
    departureCity,
    travellers,
  } = useLocalSearchParams();
  const [accent] = useThemeColor(['accent']);

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

        <View className="gap-4">
          {estimate.legs.length > 0 ? <TravelCard legs={estimate.legs} /> : null}
          {estimate.cities.map((city) => (
            <CityCard key={city.name} city={city} />
          ))}
        </View>
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
