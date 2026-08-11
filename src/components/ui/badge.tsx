import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'promotion';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<BadgeVariant, { backgroundColor: string; textColor: string }> = {
  default: { backgroundColor: Colors.muted, textColor: Colors['muted-foreground'] },
  primary: { backgroundColor: Colors.secondary, textColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondary, textColor: Colors['muted-foreground'] },
  success: { backgroundColor: Colors.successBackground, textColor: Colors.success },
  warning: { backgroundColor: Colors.warningBackground, textColor: '#B7791F' },
  error: { backgroundColor: Colors.errorBackground, textColor: Colors.error },
  info: { backgroundColor: Colors.infoBackground, textColor: Colors.info },
  promotion: { backgroundColor: '#FFEDD5', textColor: '#C2410C' },
};

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { backgroundColor, textColor } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: BorderRadius.sm,
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
