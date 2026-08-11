import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';
import { Badge } from './ui/badge';
import { Order, OrderStatus } from '@/types';
import { formatCurrency, Colors, FontSizes, Spacing } from '@/constants/theme';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber || `#${order.id}`}</Text>
          <StatusBadge status={order.status} type="order" />
        </View>

        <Text style={styles.customerName}>{order.customer?.name || 'Unknown Customer'}</Text>

        <View style={styles.footer}>
          <Text style={styles.amount}>{formatCurrency(order.totalAmount)}</Text>
          <Text style={styles.date}>
            {new Date(order.orderDate).toLocaleDateString('mn-MN')}
          </Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {order.orderItems?.length || 0} барааны зүйл
          </Text>
          <Badge
            label={order.orderType === 'Market' ? 'Зах' : 'Дэлгүүр'}
            variant="primary"
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderNumber: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    fontVariant: ['tabular-nums'],
  },
  customerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  amount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  date: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
});
