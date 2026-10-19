/**
 * Design system colors from Figma design
 * Primary color: #1565C0 (Blue)
 * Accent color: #FF8F00 (Orange)
 */

import { Platform } from 'react-native';

export const Colors = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#1976D2',
  secondary: '#E3EAF5',
  accent: '#FF8F00',
  accentLight: '#FFB74D',

  // Background colors
  background: '#F0F2F5',
  card: '#FFFFFF',
  surface: '#FFFFFF',

  // Text colors
  foreground: '#1A1A2E',
  'muted-foreground': '#6B7280',
  muted: '#ECECF0',

  // Border
  border: 'rgba(0, 0, 0, 0.08)',
  inputBorder: '#F3F4F6',

  // Status colors
  success: '#4CAF50',
  successBackground: '#E8F5E9',
  warning: '#FFC107',
  warningBackground: '#FFF8E1',
  error: '#E53935',
  errorBackground: '#FFEBEE',
  info: '#2196F3',
  infoBackground: '#E3F2FD',

  // Order status colors
  orderPending: '#FFC107',
  orderPendingBackground: '#FFF8E1',
  orderFulfilled: '#4CAF50',
  orderFulfilledBackground: '#E8F5E9',
  orderDelivered: '#2196F3',
  orderDeliveredBackground: '#E3F2FD',
  orderCancelled: '#E53935',
  orderCancelledBackground: '#FFEBEE',

  // Chart colors
  chart1: '#1565C0',
  chart2: '#FF8F00',
  chart3: '#4CAF50',
  chart4: '#E53935',
  chart5: '#9C27B0',

  // Misc
  destructive: '#E53935',
  destructiveForeground: '#ffffff',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Spacing scale (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Font sizes
export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
};

// Status badge styles
export const StatusStyles = {
  order: {
    Pending: { backgroundColor: Colors.orderPendingBackground, textColor: Colors.orderPending },
    Fulfilled: { backgroundColor: Colors.orderFulfilledBackground, textColor: Colors.orderFulfilled },
    Delivered: { backgroundColor: Colors.orderDeliveredBackground, textColor: Colors.orderDelivered },
    Cancelled: { backgroundColor: Colors.orderCancelledBackground, textColor: Colors.orderCancelled },
  },
};

// Status labels (Mongolian)
export const StatusLabels = {
  order: {
    Pending: 'Хүлээгдэж',
    Fulfilled: 'Биелсэн',
    Delivered: 'Хүргэгдсэн',
    Cancelled: 'Цуцлагдсан',
  },
};

// Payment method labels
export const PaymentMethodLabels: Record<string, string> = {
  Cash: 'Бэлэн мөнгө',
  Credit: 'Зээл',
  BankTransfer: 'Банкны шилжүүлэг',
  Sales: 'Арилжаа',
  Padan: 'Падан',
};

// Customer type labels (maps database type names to Mongolian labels)
export const CustomerTypeLabels: Record<string, string> = {
  'Зах': 'Зах',
  'Дэлгүүр': 'Дэлгүүр',
  'Хоум плаза': 'Хоум плаза',
  'Зах 2': 'Зах 2',
  'Борлуулалт': 'Борлуулалт',
  'Макс': 'Макс',
  'Наран': 'Наран',
  'Номин': 'Номин',
  'Оргил': 'Оргил',
  'Сансар': 'Сансар',
  'Марал': 'Марал',
  'Efes': 'Efes',
  'Тэнгэр': 'Тэнгэр',
  'Янта зах': 'Янта зах',
  'Эко ивээл': 'Эко ивээл',
  'Жавхлант': 'Жавхлант',
  'TV5': 'TV5',
  'Үнэгүй': 'Үнэгүй',
  'Тэнгэр хайпер': 'Тэнгэр хайпер',
  'Миний дэлгүүр': 'Миний дэлгүүр',
  'МИАТ': 'МИАТ',
  'Ресторан': 'Ресторан',
  'Амархан': 'Амархан',
  'CU': 'CU',
  'Наш': 'Наш',
  // Legacy fallback labels
  Retail: 'Жижиглэн',
  Wholesale: 'Худалдаа',
};

// Helper function to get customer type label
export const getCustomerTypeLabel = (typeName: string | null | undefined): string => {
  if (!typeName) return 'Төрөлгүй';
  return CustomerTypeLabels[typeName] || typeName;
};

// Format currency (Mongolian Tugrik)
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '₮0';
  return '₮' + amount.toLocaleString('mn-MN');
};
