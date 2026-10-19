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
import { useAuth } from '@/contexts/auth-context';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/ui/filter-chips';
import { FAB } from '@/components/ui/fab';
import { CustomerCard } from '@/components/customer-card';
import { customersApi } from '@/api/customers';
import { Customer, CustomerType } from '@/types';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Fetch customer types from API
  const fetchCustomerTypes = useCallback(async () => {
    try {
      const types = await customersApi.getCustomerTypes();
      setCustomerTypes(types);
    } catch (error) {
      console.error('Error fetching customer types:', error);
    }
  }, []);

  // Build filter options from API data
  const typeFilters = [
    { key: 'all', label: 'Бүгд' },
    ...customerTypes.slice(0, 8).map((type) => ({
      key: String(type.id),
      label: type.typeName || `Төрөл ${type.id}`,
    })),
  ];

  const fetchCustomers = useCallback(async (query: string) => {
    if (!isAuthenticated || isAuthLoading) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const filters: any = { limit: 100 };
      if (selectedFilter !== 'all') {
        // Use selectedFilter directly as customerTypeId
        filters.customerTypeId = parseInt(selectedFilter, 10);
      }
      if (query) {
        filters.search = query;
      }

      const data = await customersApi.getCustomers(filters);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter, isAuthenticated, isAuthLoading]);

  // Initial fetch when auth is ready
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      fetchCustomerTypes();
      fetchCustomers('');
    }
  }, [isAuthenticated, isAuthLoading, fetchCustomerTypes, fetchCustomers]);

  // Re-fetch when filter changes
  useEffect(() => {
    if (searchQuery) {
      fetchCustomers(searchQuery);
    }
  }, [selectedFilter, fetchCustomers]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      fetchCustomers(query);
    } else {
      setCustomers([]);
      setHasSearched(false);
    }
  };

  const handleRefresh = async () => {
    if (!searchQuery) return;
    setIsRefreshing(true);
    await fetchCustomerTypes();
    await fetchCustomers(searchQuery);
    setIsRefreshing(false);
  };

  const filteredCustomers = customers.filter((customer) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.phoneNumber?.includes(query) ||
        customer.district?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Харилцагчид</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Харилцагч хайх..."
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterChips
          options={typeFilters}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>

      {/* Customers List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() => router.push(`/customers/${item.id}`)}
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
                {hasSearched ? 'Харилцагч олдсонгүй' : 'Хайх үг оруулна уу'}
              </Text>
            )}
          </View>
        }
      />

      {/* FAB */}
      <FAB onPress={() => router.push('/customers/create')} />
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
