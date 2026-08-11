import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import { customersApi } from '@/api/customers';
import { ordersApi } from '@/api/orders';
import { Customer, Order } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius, CustomerTypeLabels } from '@/constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchCustomerOrders();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const data = await customersApi.getCustomer(Number(id));
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      Alert.alert('Алдаа', 'Харилцагчийг ачаалж чадсангүй');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerOrders = async () => {
    try {
      const response = await ordersApi.getOrders({ customerId: Number(id), limit: 10 });
      if (response.data) {
        const data = Array.isArray(response.data)
          ? response.data
          : (response.data as any).orders || [];
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const handleCall = () => {
    if (customer?.phoneNumber) {
      Linking.openURL(`tel:${customer.phoneNumber}`);
    }
  };

  const handleNavigate = () => {
    if (customer?.address) {
      const encodedAddress = encodeURIComponent(customer.address);
      Linking.openURL(`https://maps.apple.com/?daddr=${encodedAddress}`);
    }
  };

  if (isLoading || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const infoRows = [
    { label: 'Дүүрэг', value: customer.district || '-' },
    { label: 'Утас', value: customer.phoneNumber || '-' },
    { label: 'Хаяг', value: customer.address || '-' },
    { label: 'Төрөл', value: CustomerTypeLabels[customer.customerType?.typeName || 'Retail'] || 'Жижиглэн' },
    { label: 'НӨАТ', value: customer.isVatPayer ? 'Бүртгэлтэй' : 'Бүртгэлгүй' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name?.charAt(0) || 'C'}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <View style={styles.badges}>
              <Badge
                label={CustomerTypeLabels[customer.customerType?.typeName || 'Retail'] || 'Жижиглэн'}
                variant={customer.customerType?.typeName === 'Wholesale' ? 'info' : 'success'}
              />
              {customer.isVatPayer && <Badge label="VAT" variant="primary" />}
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleCall}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.successBackground }]}>
              <Ionicons name="call" size={20} color={Colors.success} />
            </View>
            <View>
              <Text style={styles.quickActionLabel}>Залгах</Text>
              <Text style={styles.quickActionDetail}>{customer.phoneNumber || '-'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleNavigate}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.infoBackground }]}>
              <Ionicons name="navigate" size={20} color={Colors.info} />
            </View>
            <View>
              <Text style={styles.quickActionLabel}>Газрын зураг</Text>
              <Text style={styles.quickActionDetail}>{customer.district || '-'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Table */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Мэдээлэл</Text>
          <View style={styles.infoTable}>
            {infoRows.map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Recent Orders */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>Сүүлийн захиалгууд</Text>
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => router.push(`/orders/${order.id}`)}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Захиалга байхгүй байна</Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  quickActionDetail: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  infoTable: {
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  ordersSection: {
    marginTop: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
});
