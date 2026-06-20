import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Surface, Text } from 'heroui-native';
import { ArrowLeft, Bed, Plane, Train, Ticket, Utensils } from 'lucide-react-native';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import type { BookedItem } from '@/lib/tripEstimate';

const BRAND = {
  pink: '#CD1A6F',
  purple: '#6320EE',
  pinkSoft: 'rgba(205, 26, 111, 0.10)',
  purpleSoft: 'rgba(99, 32, 238, 0.10)',
};

const BODY_FONT = Platform.select({
  ios: 'System',
  default: undefined,
});

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

const CATEGORY_ICON: Record<BookedItem['category'], typeof Plane> = {
  flight: Plane,
  train: Train,
  hotel: Bed,
  restaurant: Utensils,
  activity: Ticket,
};

function parseItems(raw: unknown): BookedItem[] {
  if (!raw) return [];
  try {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed: unknown = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is BookedItem =>
        x !== null && typeof x === 'object' && 'title' in x && 'category' in x && 'price' in x,
    );
  } catch {
    return [];
  }
}

function parseCities(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed: unknown = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function one(value: unknown, fallback = ''): string {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return typeof value === 'string' ? value : fallback;
}

function ItemRow({ item }: { item: BookedItem }) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: BRAND.purpleSoft }}
      >
        <Icon size={17} color={BRAND.purple} strokeWidth={2} />
      </View>
      <View className="flex-1 pr-3">
        <Text
          className="text-base"
          style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
        >
          {item.title}
        </Text>
        <Text className="mt-0.5 text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
          {item.category} · {item.detail}
        </Text>
      </View>
      <Text
        className="text-base"
        style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#1a1a1a' }}
      >
        {formatMoney(item.price)}
      </Text>
    </View>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const items = useMemo(() => parseItems(params.items), [params.items]);
  const cityOrder = useMemo(() => parseCities(params.cities), [params.cities]);

  const start = one(params.startDate);
  const end = one(params.endDate);
  const departure = one(params.departureCity);
  const travellers = one(params.travellers, '1');
  const cityDurationsStr = one(params.cityDurations);

  const total = useMemo(() => {
    const passed = Number(one(params.total, '0'));
    if (passed > 0) return passed;
    return items.reduce((sum, i) => sum + i.price, 0);
  }, [params.total, items]);

  // Group items by city in trip order.
  const grouped = useMemo(() => {
    const order = cityOrder.length > 0 ? cityOrder : [...new Set(items.map((i) => i.city))];
    return order
      .map((city) => ({ city, items: items.filter((i) => i.city === city) }))
      .filter((g) => g.items.length > 0);
  }, [cityOrder, items]);

  const dateLabel = formatDates(start, end);

  const goConfirm = () =>
    router.push({
      pathname: '/confirmation',
      params: {
        total: String(total),
        startDate: start,
        endDate: end,
        departureCity: departure,
        travellers,
        cities: JSON.stringify(cityOrder),
        cityDurations: cityDurationsStr,
        items: JSON.stringify(items),
      },
    });

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
            back to adjust
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-1 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text
            className="text-3xl"
            style={{ fontFamily: BODY_FONT, fontWeight: '800', color: '#1a1a1a' }}
          >
            looking good?
          </Text>
          {dateLabel ? (
            <Text className="mt-1 text-sm" style={{ fontFamily: BODY_FONT, color: '#6b6b6b' }}>
              {departure ? `${departure.toLowerCase()} · ` : ''}
              {dateLabel}
            </Text>
          ) : null}
        </View>

        {grouped.map((group) => (
          <Surface
            key={group.city}
            className="px-5 pb-3"
            style={{ backgroundColor: '#fff', borderRadius: 24 }}
          >
            <Text
              className="pt-4 pb-1 text-xs"
              style={{
                fontFamily: BODY_FONT,
                fontWeight: '800',
                color: BRAND.pink,
                letterSpacing: 0.6,
              }}
            >
              {group.city.toUpperCase()}
            </Text>
            {group.items.map((item, idx) => (
              <View key={item.title}>
                {idx > 0 ? <View className="h-px" style={{ backgroundColor: '#f0f0f0' }} /> : null}
                <ItemRow item={item} />
              </View>
            ))}
          </Surface>
        ))}
      </ScrollView>

      <View
        className="pb-safe-offset-3 gap-3 px-5 pt-4"
        style={{ borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }}
      >
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-base"
            style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#1a1a1a' }}
          >
            trip total
          </Text>
          <Text
            className="text-2xl"
            style={{ fontFamily: BODY_FONT, fontWeight: '700', color: BRAND.purple }}
          >
            {formatMoney(total)}
          </Text>
        </View>
        <Text className="text-xs" style={{ fontFamily: BODY_FONT, color: '#9a9a9a' }}>
          bilt-budget earns a small commission on this booking — never more than you&apos;d pay
          anyway.
        </Text>
        <Pressable
          onPress={goConfirm}
          className="flex-row items-center justify-center rounded-full py-3.5"
          style={{ backgroundColor: BRAND.pink }}
        >
          <Text
            className="text-base"
            style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
          >
            confirm trip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
