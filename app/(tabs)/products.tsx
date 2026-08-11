import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/ui/filter-chips';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { productsApi } from '@/api/products';
import { Product, Category } from '@/types';
import { formatCurrency, Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchProducts = useCallback(async () => {
    // Only search if there's a query or category selected
    if (!searchQuery && !selectedCategory) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await productsApi.getProducts({
        search: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        limit: 100,
      });
      if (response.data) {
        const data = Array.isArray(response.data)
          ? response.data
          : (response.data as any).products || [];
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const data = await productsApi.getCategories();
      if (data) {
        setCategories(Array.isArray(data) ? data : (data as any).categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProducts();
    setIsRefreshing(false);
  };

  const categoryFilters = [
    { key: 'all', label: 'Бүгд' },
    ...categories.map((c) => ({ key: String(c.id), label: c.nameMongolian || c.nameEnglish || 'Unknown' })),
  ];

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => router.push(`/products/${item.id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.nameMongolian || item.nameEnglish}</Text>
            {item.productCode && (
              <Text style={styles.productCode}>{item.productCode}</Text>
            )}
          </View>
          <Badge
            label={item.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
            variant={item.isActive ? 'success' : 'error'}
          />
        </View>

        <View style={styles.productDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Үлдэгдэл</Text>
            <Text style={[
              styles.detailValue,
              item.stockQuantity < 10 && styles.lowStock
            ]}>
              {item.stockQuantity}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Үнэ</Text>
            <Text style={styles.detailValue}>{formatCurrency(item.defaultPrice)}</Text>
          </View>
          {item.category && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ангилал</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.category.nameMongolian || item.category.nameEnglish}
              </Text>
            </View>
          )}
        </View>

        {item.barcode && (
          <Text style={styles.barcode}>📊 {item.barcode}</Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Бараа</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Бараа хайх..."
        />
      </View>

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={categoryFilters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                (item.key === 'all' ? selectedCategory === null : selectedCategory === Number(item.key)) &&
                  styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(item.key === 'all' ? null : Number(item.key))}
            >
              <Text
                style={[
                  styles.filterChipText,
                  (item.key === 'all' ? selectedCategory === null : selectedCategory === Number(item.key)) &&
                    styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
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
            ) : !hasSearched ? (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search" size={48} color={Colors.muted} />
                <Text style={styles.emptySearchTitle}>Бараа хайх</Text>
                <Text style={styles.emptySearchText}>
                  Барааны нэр эсвэл кодоор хайна уу
                </Text>
              </View>
            ) : (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="cube-outline" size={48} color={Colors.muted} />
                <Text style={styles.emptySearchTitle}>Бараа олдсонгүй</Text>
                <Text style={styles.emptySearchText}>
                  Өөр нэр эсвэл кодоор оролдоно уу
                </Text>
              </View>
            )}
          </View>
        }
      />
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
    paddingBottom: Spacing.sm,
  },
  filtersList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  productCard: {
    marginBottom: Spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  productInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  productCode: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  productDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  lowStock: {
    color: Colors.error,
  },
  barcode: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptySearchTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.md,
  },
  emptySearchText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
});
