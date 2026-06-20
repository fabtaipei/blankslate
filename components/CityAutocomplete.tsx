import { Input, Surface, Text, useThemeColor } from 'heroui-native';
import { MapPin, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  type NativeSyntheticEvent,
  Pressable,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';

import { searchCities, type City } from '@/lib/cities';

type CityAutocompleteProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (city: City) => void;
  placeholder?: string;
  /** City names already chosen, hidden from suggestions. */
  exclude?: string[];
  /** Optional add button on the right (used by the destinations field). */
  showAddButton?: boolean;
  onAdd?: () => void;
};

export function CityAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder,
  exclude = [],
  showAddButton = false,
  onAdd,
}: CityAutocompleteProps) {
  const [accentForeground, accent, muted] = useThemeColor(['accent-foreground', 'accent', 'muted']);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const matches = useMemo(() => searchCities(value, exclude, 8), [value, exclude]);

  const open = focused && value.trim().length > 0;

  // Reset keyboard highlight whenever the search text changes.
  useEffect(() => {
    setHighlight(-1);
  }, [value]);

  const handleSelect = (city: City) => {
    setHighlight(-1);
    onSelect(city);
  };

  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const key = event.nativeEvent.key;

    if (!open || matches.length === 0) {
      if (key === 'Enter' && onAdd) onAdd();
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault?.();
      setHighlight((prev) => (prev + 1) % matches.length);
    } else if (key === 'ArrowUp') {
      event.preventDefault?.();
      setHighlight((prev) => (prev <= 0 ? matches.length - 1 : prev - 1));
    } else if (key === 'Enter') {
      event.preventDefault?.();
      const target = highlight >= 0 ? matches[highlight] : matches[0];
      if (target) handleSelect(target);
    } else if (key === 'Escape') {
      event.preventDefault?.();
      setFocused(false);
      setHighlight(-1);
    }
  };

  return (
    <View className="relative">
      <View className="flex-row items-center gap-2">
        <Input
          className="flex-1"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyPress={handleKeyPress}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        {showAddButton ? (
          <Pressable
            onPress={onAdd}
            disabled={value.trim().length === 0}
            className="bg-accent h-12 w-12 items-center justify-center rounded-2xl"
            style={{ opacity: value.trim().length === 0 ? 0.4 : 1 }}
          >
            <Plus size={20} color={accentForeground} />
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <Surface className="border-border mt-2 overflow-hidden rounded-2xl border">
          {matches.length > 0 ? (
            matches.map((city, index) => (
              <Pressable
                key={`${city.name}-${city.country}`}
                onPress={() => handleSelect(city)}
                className="active:bg-brand-purple-soft flex-row items-center gap-3 px-4 py-3"
                style={[
                  index < matches.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }
                    : null,
                  index === highlight ? { backgroundColor: 'oklch(0.502 0.27 285.6 / 0.1)' } : null,
                ]}
              >
                <MapPin size={16} color={accent} />
                <Text className="flex-1 text-base font-medium">
                  {city.name}
                  <Text className="text-sm" color="muted">
                    {`,  ${city.country}`}
                  </Text>
                </Text>
              </Pressable>
            ))
          ) : (
            <View className="px-4 py-3.5">
              <Text className="text-sm" style={{ color: muted }}>
                no matches — try a different spelling
              </Text>
            </View>
          )}
        </Surface>
      ) : null}
    </View>
  );
}
