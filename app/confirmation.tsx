import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import { MapPin, PartyPopper, Share2, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Share, View } from 'react-native';

const BRAND = {
  pink: '#CD1A6F',
  purple: '#6320EE',
};

const BODY_FONT = Platform.select({
  ios: 'System',
  default: undefined,
});

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
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

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const cities = useMemo(() => parseCities(params.cities), [params.cities]);
  const start = one(params.startDate);
  const end = one(params.endDate);
  const departure = one(params.departureCity);
  const travellers = Number(one(params.travellers, '1'));
  const total = Number(one(params.total, '0'));

  const dateLabel = formatDates(start, end);
  const travellerLabel = `${travellers} ${travellers === 1 ? 'traveller' : 'travellers'}`;

  const onShare = async () => {
    const lines = [
      'my trip is booked with bilt-budget ✨',
      departure ? `from ${departure}` : '',
      cities.length > 0 ? `→ ${cities.join(' → ')}` : '',
      dateLabel ?? '',
      `${travellerLabel} · ${formatMoney(total)} total`,
    ].filter(Boolean);
    const message = lines.join('\n');
    try {
      if (Platform.OS === 'web') {
        const nav = globalThis.navigator as Navigator & {
          share?: (data: { text?: string; title?: string }) => Promise<void>;
        };
        if (typeof nav?.share === 'function') {
          await nav.share({ title: 'my trip', text: message });
          return;
        }
        await globalThis.navigator?.clipboard?.writeText(message);
        return;
      }
      await Share.share({ message });
    } catch {
      // user dismissed the share sheet — nothing to do.
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#fafafa' }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-safe-offset-8 pb-10 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center gap-3">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND.pink }}
          >
            <PartyPopper size={30} color="#fff" strokeWidth={2.2} />
          </View>
          <Text
            className="text-center text-3xl"
            style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#1a1a1a' }}
          >
            you&apos;re all set!
          </Text>
          <Text
            className="text-center text-base"
            style={{ fontFamily: BODY_FONT, color: '#6b6b6b', maxWidth: 300 }}
          >
            your trip is locked in. here&apos;s the summary worth screenshotting.
          </Text>
        </View>

        {/* Trip summary card — the screenshottable artifact */}
        <View
          className="overflow-hidden rounded-3xl"
          style={{
            backgroundColor: BRAND.purple,
            shadowColor: BRAND.purple,
            shadowOpacity: 0.25,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <View className="gap-5 p-6">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-xs"
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 1,
                }}
              >
                BILT-BUDGET
              </Text>
              <Text
                className="text-xs"
                style={{ fontFamily: BODY_FONT, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}
              >
                {dateLabel ?? ''}
              </Text>
            </View>

            <View className="gap-1">
              <Text
                className="text-xs"
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.6)',
                  letterSpacing: 0.5,
                }}
              >
                STARTING FROM
              </Text>
              <Text
                className="text-2xl"
                style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
              >
                {departure ? departure.toLowerCase() : 'your city'}
              </Text>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <MapPin size={15} color="rgba(255,255,255,0.8)" strokeWidth={2.4} />
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: 0.5,
                  }}
                >
                  ITINERARY
                </Text>
              </View>
              <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                {cities.map((city, idx) => (
                  <View key={city} className="flex-row items-center gap-1.5">
                    <Text
                      className="text-lg"
                      style={{ fontFamily: BODY_FONT, fontWeight: '600', color: '#fff' }}
                    >
                      {city.toLowerCase()}
                    </Text>
                    {idx < cities.length - 1 ? (
                      <Text
                        className="text-lg"
                        style={{ fontFamily: BODY_FONT, color: 'rgba(255,255,255,0.5)' }}
                      >
                        →
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            <View className="h-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

            <View className="flex-row items-end justify-between">
              <View className="flex-row items-center gap-1.5">
                <Users size={15} color="rgba(255,255,255,0.8)" strokeWidth={2.4} />
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {travellerLabel}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-xs"
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: 0.5,
                  }}
                >
                  TOTAL
                </Text>
                <Text
                  className="text-3xl"
                  style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
                >
                  {formatMoney(total)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Share */}
        <Pressable
          onPress={onShare}
          className="flex-row items-center justify-center gap-2 rounded-full py-3.5"
          style={{ backgroundColor: BRAND.pink }}
        >
          <Share2 size={18} color="#fff" strokeWidth={2.4} />
          <Text
            className="text-base"
            style={{ fontFamily: BODY_FONT, fontWeight: '700', color: '#fff' }}
          >
            save / share trip
          </Text>
        </Pressable>

        {/* Start over */}
        <Pressable onPress={() => router.dismissAll()} className="items-center py-1" hitSlop={8}>
          <Text
            className="text-sm"
            style={{ fontFamily: BODY_FONT, fontWeight: '600', color: BRAND.purple }}
          >
            start a new trip
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
