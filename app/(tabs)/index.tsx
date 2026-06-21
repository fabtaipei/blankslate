import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Spinner, Surface, Tabs, Text, useThemeColor } from 'heroui-native';
import { ArrowDown, ArrowUp, Calendar, Minus, Plus, Sparkles, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { CityAutocomplete } from '@/components/CityAutocomplete';
import { DateRangeCalendar } from '@/components/DateRangeCalendar';
import type { City } from '@/lib/cities';
import { usePendingReorder } from '@/lib/routeSuggestion';
import {
  cityDateRanges,
  formatCityDateRange,
  getTripEstimate,
  suggestCityDurations,
  totalTripDays,
  type TripData,
  type TripStyle,
} from '@/lib/tripEstimate';

const TRIP_STYLES: { value: TripStyle; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid-range', label: 'Mid-range' },
  { value: 'luxury', label: 'Luxury' },
];

function formatDateLabel(iso: string | null): string {
  if (!iso) return 'Select';
  return format(new Date(`${iso}T00:00:00`), 'MMM d, yyyy');
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-brand-pink mb-2.5 text-sm font-extrabold lowercase">{children}</Text>
  );
}

function StepBadge({ index }: { index: number }) {
  return (
    <View className="bg-brand-purple h-8 w-8 items-center justify-center rounded-full">
      <Text className="text-sm font-extrabold" style={{ color: '#fff' }}>
        {index + 1}
      </Text>
    </View>
  );
}

export default function TripInputScreen() {
  const router = useRouter();
  const [accentForeground, muted, foreground, accent] = useThemeColor([
    'accent-foreground',
    'muted',
    'foreground',
    'accent',
  ]);

  const [departureCity, setDepartureCity] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [cityDurations, setCityDurations] = useState<number[]>([]);
  const [tripStyle, setTripStyle] = useState<TripStyle>('mid-range');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [travellers, setTravellers] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tripDays = useMemo(() => totalTripDays(startDate, endDate), [startDate, endDate]);

  // Reset the per-city split to the smart default whenever the destination list
  // or the overall trip length changes.
  useEffect(() => {
    if (cities.length === 0 || tripDays <= 0) {
      setCityDurations(cities.map(() => 0));
      return;
    }
    setCityDurations(suggestCityDurations(cities, tripDays));
  }, [cities, tripDays]);

  // Apply an accepted route-order suggestion handed off from the book screen:
  // reorder the existing cities to match (same set only), then clear it. The
  // duration effect above re-splits days for the new order.
  const pendingOrder = usePendingReorder((s) => s.order);
  const clearPendingOrder = usePendingReorder((s) => s.setOrder);
  useEffect(() => {
    if (!pendingOrder) return;
    setCities((prev) => {
      const sameSet =
        pendingOrder.length === prev.length &&
        pendingOrder.every((c) => prev.includes(c)) &&
        prev.every((c) => pendingOrder.includes(c));
      return sameSet ? [...pendingOrder] : prev;
    });
    clearPendingOrder(null);
  }, [pendingOrder, clearPendingOrder]);

  const daysAllocated = cityDurations.reduce((a, b) => a + b, 0);
  const daysMatch = tripDays > 0 && daysAllocated === tripDays;

  // Live per-city date windows derived from the start date + current day split.
  const dateRanges = useMemo(
    () => cityDateRanges(startDate, cityDurations, cities.length),
    [startDate, cityDurations, cities.length],
  );

  const addCityByName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = cities.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setCities((prev) => [...prev, trimmed]);
    }
    setCityInput('');
    Keyboard.dismiss();
  };

  const selectDestination = (city: City) => {
    addCityByName(city.name);
  };

  const selectDeparture = (city: City) => {
    setDepartureCity(city.name);
    Keyboard.dismiss();
  };

  const removeCity = (name: string) => {
    setCities((prev) => prev.filter((c) => c !== name));
  };

  const moveCity = (index: number, direction: -1 | 1) => {
    setCities((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const adjustDuration = (index: number, delta: -1 | 1) => {
    setCityDurations((prev) => prev.map((d, i) => (i === index ? Math.max(1, d + delta) : d)));
  };

  const canSubmit =
    cities.length > 0 && departureCity.trim().length > 0 && daysMatch && !isSubmitting;

  const handleSubmit = async () => {
    if (cities.length === 0 || departureCity.trim().length === 0 || !daysMatch) return;
    setIsSubmitting(true);

    const tripData: TripData = {
      departureCity: departureCity.trim(),
      cities,
      cityDurations,
      tripStyle,
      startDate: startDate ?? format(new Date(), 'yyyy-MM-dd'),
      endDate: endDate ?? startDate ?? format(new Date(), 'yyyy-MM-dd'),
      travellers,
    };

    try {
      const estimate = await getTripEstimate(tripData);
      router.push({
        pathname: '/results',
        params: {
          estimate: JSON.stringify(estimate),
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          departureCity: tripData.departureCity,
          travellers: String(tripData.travellers),
          cityDurations: JSON.stringify(tripData.cityDurations),
          tripStyle: tripData.tripStyle,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="bg-background flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6 gap-7"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#6320EE', '#CD1A6F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 64,
              paddingBottom: 28,
              paddingHorizontal: 20,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} color="#fff" strokeWidth={2.5} />
              <Text
                className="text-sm font-extrabold lowercase"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                bilt-budget
              </Text>
            </View>
            <Text className="mt-3 text-4xl font-extrabold" style={{ color: '#fff' }}>
              where to next?
            </Text>
            <Text
              className="mt-1.5 text-base leading-5"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              pick your spots — we&apos;ll do the maths and sort the budget. ✦
            </Text>
          </LinearGradient>

          <View className="gap-7 px-5">
            {/* Departure city */}
            <View className="z-20">
              <FieldLabel>starting from</FieldLabel>
              <CityAutocomplete
                value={departureCity}
                onChangeText={setDepartureCity}
                onSelect={selectDeparture}
                placeholder="where does the trip begin?"
              />
            </View>

            {/* Cities */}
            <View className="z-10">
              <FieldLabel>where to?</FieldLabel>
              <CityAutocomplete
                value={cityInput}
                onChangeText={setCityInput}
                onSelect={selectDestination}
                exclude={cities}
                placeholder="add a city or country"
              />

              {cities.length > 0 ? (
                <View className="mt-3 gap-2">
                  {cities.map((city, index) => (
                    <Surface
                      key={city}
                      variant="secondary"
                      className="flex-row items-center justify-between rounded-3xl p-3.5"
                    >
                      <View className="flex-1 flex-row items-center gap-3">
                        <StepBadge index={index} />
                        <Text className="flex-1 text-base font-bold">{city}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          onPress={() => moveCity(index, -1)}
                          isDisabled={index === 0}
                        >
                          <ArrowUp size={18} color={foreground} />
                        </Button>
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          onPress={() => moveCity(index, 1)}
                          isDisabled={index === cities.length - 1}
                        >
                          <ArrowDown size={18} color={foreground} />
                        </Button>
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          onPress={() => removeCity(city)}
                        >
                          <X size={18} color={muted} />
                        </Button>
                      </View>
                    </Surface>
                  ))}
                </View>
              ) : (
                <Text className="mt-2 text-sm" color="muted">
                  add at least one spot to keep going.
                </Text>
              )}
            </View>

            {/* Trip style */}
            <View>
              <FieldLabel>your vibe</FieldLabel>
              <Tabs
                value={tripStyle}
                onValueChange={(v) => {
                  const style = TRIP_STYLES.find((s) => s.value === v);
                  if (style) setTripStyle(style.value);
                }}
              >
                <Tabs.List>
                  <Tabs.Indicator />
                  {TRIP_STYLES.map((style) => (
                    <Tabs.Trigger key={style.value} value={style.value}>
                      <Tabs.Label>{style.label}</Tabs.Label>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </Tabs>
            </View>

            {/* Date range */}
            <View>
              <FieldLabel>when?</FieldLabel>
              <Pressable onPress={() => setShowCalendar((s) => !s)}>
                <Surface
                  variant="secondary"
                  className="flex-row items-center justify-between rounded-3xl p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <Calendar size={20} color={accent} />
                    <View>
                      <Text className="text-base font-semibold">
                        {formatDateLabel(startDate)}
                        {'  →  '}
                        {formatDateLabel(endDate)}
                      </Text>
                      <Text className="text-xs" color="muted">
                        {startDate && endDate ? 'tap to edit' : 'tap to pick your dates'}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </Pressable>

              {showCalendar ? (
                <Surface variant="secondary" className="mt-3 rounded-3xl p-4">
                  <DateRangeCalendar
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(s, e) => {
                      setStartDate(s);
                      setEndDate(e);
                    }}
                  />
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="mt-2 self-end"
                    onPress={() => setShowCalendar(false)}
                  >
                    Done
                  </Button>
                </Surface>
              ) : null}
            </View>

            {/* Travellers */}
            <View>
              <FieldLabel>who&apos;s coming?</FieldLabel>
              <Surface
                variant="secondary"
                className="flex-row items-center justify-between rounded-3xl p-3.5"
              >
                <Text className="text-base font-bold">
                  {travellers} {travellers === 1 ? 'traveller' : 'travellers'}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Button
                    isIconOnly
                    variant="tertiary"
                    size="sm"
                    onPress={() => setTravellers((t) => Math.max(1, t - 1))}
                    isDisabled={travellers <= 1}
                  >
                    <Minus size={18} color={foreground} />
                  </Button>
                  <Text className="w-6 text-center text-lg font-extrabold">{travellers}</Text>
                  <Button
                    isIconOnly
                    variant="tertiary"
                    size="sm"
                    onPress={() => setTravellers((t) => t + 1)}
                  >
                    <Plus size={18} color={foreground} />
                  </Button>
                </View>
              </Surface>
            </View>

            {/* Per-city durations */}
            {cities.length > 0 && tripDays > 0 ? (
              <View>
                <FieldLabel>how long where?</FieldLabel>
                <View className="gap-2">
                  {cities.map((city, index) => (
                    <Surface
                      key={city}
                      variant="secondary"
                      className="flex-row items-center justify-between rounded-3xl p-3.5"
                    >
                      <View className="flex-1 flex-row items-center gap-3 pr-3">
                        <StepBadge index={index} />
                        <View className="flex-1">
                          <Text className="text-base font-bold" numberOfLines={1}>
                            {city}
                          </Text>
                          <Text className="text-xs" color="muted">
                            {startDate
                              ? formatCityDateRange(
                                  dateRanges[index] ?? { startISO: null, endISO: null, days: [] },
                                  cityDurations[index] ?? 0,
                                )
                              : `${cityDurations[index] ?? 0} ${
                                  (cityDurations[index] ?? 0) === 1 ? 'day' : 'days'
                                }`}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          onPress={() => adjustDuration(index, -1)}
                          isDisabled={(cityDurations[index] ?? 0) <= 1}
                        >
                          <Minus size={18} color={foreground} />
                        </Button>
                        <Text className="w-6 text-center text-lg font-extrabold">
                          {cityDurations[index] ?? 0}
                        </Text>
                        <Button
                          isIconOnly
                          variant="tertiary"
                          size="sm"
                          onPress={() => adjustDuration(index, 1)}
                        >
                          <Plus size={18} color={foreground} />
                        </Button>
                      </View>
                    </Surface>
                  ))}
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: daysMatch ? accent : '#dc2626' }}
                  >
                    {daysAllocated} of {tripDays} {tripDays === 1 ? 'day' : 'days'} planned
                  </Text>
                  {!daysMatch ? (
                    <Text className="text-sm font-medium" style={{ color: '#dc2626' }}>
                      {daysAllocated > tripDays
                        ? `${daysAllocated - tripDays} too many`
                        : `${tripDays - daysAllocated} to place`}
                    </Text>
                  ) : null}
                </View>
                {!daysMatch ? (
                  <Text className="mt-1 text-sm" style={{ color: '#dc2626' }}>
                    your days don&apos;t add up yet — adjust above
                  </Text>
                ) : null}
              </View>
            ) : cities.length > 0 ? (
              <View>
                <FieldLabel>how long where?</FieldLabel>
                <Text className="text-sm" color="muted">
                  pick your dates above and we&apos;ll split your days for you.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Submit */}
        <View className="border-border bg-background pb-safe-offset-3 border-t px-5 pt-3">
          <Button variant="primary" size="lg" isDisabled={!canSubmit} onPress={handleSubmit}>
            {isSubmitting ? (
              <View className="flex-row items-center gap-2">
                <Spinner size="sm" color="accent-foreground" />
                <Text style={{ color: accentForeground }} className="font-bold">
                  crunching the numbers...
                </Text>
              </View>
            ) : (
              "let's see the damage"
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
