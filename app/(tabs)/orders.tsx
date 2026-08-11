import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/ui/filter-chips';
import { FAB } from '@/components/ui/fab';
import { OrderCard } from '@/components/order-card';
import { ordersApi } from '@/api/orders';
import { Order, OrderStatus } from '@/types';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

const statusFilters = [
  { key: 'all', label: 'Бүгд' },
  { key: 'Pending', label: 'Хүлээгдэж' },
  { key: 'Fulfilled', label: 'Биелсэн' },
  { key: 'Delivered', label: 'Хүргэгдсэн' },
  { key: 'Cancelled', label: 'Цуцлагдсан' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchOrders = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const filters: any = { limit: 50 };
      if (selectedFilter !== 'all') {
        filters.status = selectedFilter as OrderStatus;
      }
      if (query) {
        filters.search = query;
      }

      const response = await ordersApi.getOrders(filters);
      if (response.data) {
        const data = Array.isArray(response.data)
          ? response.data
          : (response.data as any).orders || [];
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    // Auto-search when filter changes and there's a search query
    if (searchQuery) {
      fetchOrders(searchQuery);
    }
  }, [selectedFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      fetchOrders(query);
    } else {
      setOrders([]);
      setHasSearched(false);
    }
  };

  const handleRefresh = async () => {
    if (!searchQuery) return;
    setIsRefreshing(true);
    await fetchOrders(searchQuery);
    setIsRefreshing(false);
  };

  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.customer?.name?.toLowerCase().includes(query) ||
        order.orderNumber?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Захиалгууд</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Захиалга хайх..."
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterChips
          options={statusFilters}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/orders/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <Text style={styles.emptyText}>
                {hasSearched ? 'Захиалга олдсонгүй' : 'Хайх үг оруулна уу'}
              </Text>
            )}
          </View>
        }
      />

      {/* FAB */}
      <FAB onPress={() => router.push('/orders/create')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
});
