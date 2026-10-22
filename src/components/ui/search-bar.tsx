import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  /** Style for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Style for the text input itself. */
  inputStyle?: TextInputProps['style'];
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Хайх...',
  style,
  inputStyle,
  ...props
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color={Colors['muted-foreground']} style={styles.icon} />
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors['muted-foreground']}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md - 4,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md - 4,
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
});
