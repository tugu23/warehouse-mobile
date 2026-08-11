import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Card } from './card';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface StatsCardProps {
  label: string;
  value: string | number;
  style?: StyleProp<ViewStyle>;
}

export function StatsCard({ label, value, style }: StatsCardProps) {
  return (
    <Card style={style}>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  value: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
});
