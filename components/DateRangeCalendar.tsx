import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Text, useThemeColor } from 'heroui-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

interface DateRangeCalendarProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

const WEEKDAYS = [
  { label: 'S', key: 'sun' },
  { label: 'M', key: 'mon' },
  { label: 'T', key: 'tue' },
  { label: 'W', key: 'wed' },
  { label: 'T', key: 'thu' },
  { label: 'F', key: 'fri' },
  { label: 'S', key: 'sat' },
];

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DateRangeCalendar({ startDate, endDate, onChange }: DateRangeCalendarProps) {
  const [accent, accentForeground, muted] = useThemeColor(['accent', 'accent-foreground', 'muted']);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;

  // Earliest selectable day: today by default (today stays selectable). While
  // picking the end date (start chosen, no end yet), the floor is the start date
  // so no end before the start can be tapped.
  const today = startOfToday();
  const minSelectable = start && !end ? (isBefore(start, today) ? today : start) : today;

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => start ?? new Date());

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(visibleMonth));
    const gridEnd = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const handleSelect = (day: Date) => {
    // Safety net — disabled days aren't tappable, but never act on a past /
    // pre-start day even if one slips through.
    if (isBefore(day, minSelectable)) return;
    const iso = toISO(day);
    // Picking logic: no start -> set start. Start but no end -> set end (or swap).
    // Both set -> restart range from this day.
    if (!start || (start && end)) {
      onChange(iso, null);
      return;
    }
    if (isBefore(day, start)) {
      onChange(iso, startDate);
      return;
    }
    if (isSameDay(day, start)) {
      onChange(iso, iso);
      return;
    }
    onChange(startDate, iso);
  };

  const isInRange = (day: Date) => {
    if (!start || !end) return false;
    return (
      (isAfter(day, start) || isSameDay(day, start)) && (isBefore(day, end) || isSameDay(day, end))
    );
  };

  const isEndpoint = (day: Date) =>
    (start && isSameDay(day, start)) || (end && isSameDay(day, end));

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={() => setVisibleMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft size={18} color={muted} />
        </Button>
        <Text className="text-base font-semibold">{format(visibleMonth, 'MMMM yyyy')}</Text>
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={() => setVisibleMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight size={18} color={muted} />
        </Button>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((d) => (
          <View key={d.key} className="flex-1 items-center py-1">
            <Text className="text-xs" color="muted">
              {d.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day: Date) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const inRange = isInRange(day);
          const endpoint = isEndpoint(day);
          // Before today, or before the chosen start while picking the end.
          const disabled = isBefore(day, minSelectable);
          return (
            <View key={day.toISOString()} className="w-[14.28%] items-center py-0.5">
              <Pressable
                onPress={() => handleSelect(day)}
                disabled={disabled}
                accessibilityState={{ disabled }}
                className={cn(
                  'h-9 w-9 items-center justify-center rounded-full',
                  inRange && !endpoint && 'bg-accent/15 rounded-none',
                  endpoint && 'rounded-full',
                )}
                style={endpoint && !disabled ? { backgroundColor: accent } : undefined}
              >
                <Text
                  className={cn(
                    'text-sm',
                    !inMonth && 'opacity-30',
                    // Greyed out and visibly non-tappable.
                    disabled && 'text-foreground/25',
                  )}
                  style={endpoint && !disabled ? { color: accentForeground } : undefined}
                >
                  {format(day, 'd')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
