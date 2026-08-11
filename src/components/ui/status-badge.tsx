import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Badge } from './badge';
import { Colors } from '@/constants/theme';

type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Fulfilled' | 'Delivered' | 'Cancelled' | 'Returned';

interface StatusBadgeProps {
  status: OrderStatus;
  type: 'order';
  style?: StyleProp<ViewStyle>;
}

const orderStatusConfig: Record<OrderStatus, { backgroundColor: string; textColor: string }> = {
  Pending: { backgroundColor: Colors.warningBackground, textColor: '#B7791F' },
  Confirmed: { backgroundColor: Colors.infoBackground, textColor: Colors.info },
  Processing: { backgroundColor: Colors.infoBackground, textColor: Colors.info },
  Shipped: { backgroundColor: Colors.secondary, textColor: Colors.primary },
  Fulfilled: { backgroundColor: Colors.successBackground, textColor: Colors.success },
  Delivered: { backgroundColor: Colors.successBackground, textColor: Colors.success },
  Cancelled: { backgroundColor: Colors.errorBackground, textColor: Colors.error },
  Returned: { backgroundColor: Colors.errorBackground, textColor: Colors.error },
};

const orderLabels: Record<OrderStatus, string> = {
  Pending: 'Хүлээгдэж буй',
  Confirmed: 'Баталгаажсан',
  Processing: 'Боловсруулагджа буй',
  Shipped: 'Илгээгдсэн',
  Fulfilled: 'Гүйцэтгэгдсэн',
  Delivered: 'Хүргэгдсэн',
  Cancelled: 'Цуцлагдсан',
  Returned: 'Буцаагдсан',
};

export function StatusBadge({ status, type, style }: StatusBadgeProps) {
  const config = orderStatusConfig[status as OrderStatus];
  const label = orderLabels[status as OrderStatus];

  return (
    <Badge
      label={label || status}
      style={[
        {
          backgroundColor: config?.backgroundColor,
        },
        style,
      ]}
    />
  );
}
