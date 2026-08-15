import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { productsApi } from '@/api/products';
import { Product } from '@/types';
import { formatCurrency, Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await productsApi.getProduct(Number(id));
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Алдаа', 'Барааг ачаалж чадсангүй');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Устгах',
      `${product?.nameMongolian || product?.nameEnglish} устагахдаа итгэлтэй байна уу?`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await productsApi.deleteProduct(Number(id));
              router.back();
            } catch (error: any) {
              Alert.alert(
                'Алдаа',
                error.response?.data?.message || 'Устгах явцад алдаа гарлаа'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const infoRows = [
    { label: 'Код', value: product.productCode || '-' },
    { label: 'Баркод', value: product.barcode || '-' },
    { label: 'Ангилал', value: product.category?.nameMongolian || product.category?.nameEnglish || '-' },
    { label: 'Үлдэгдэл', value: String(product.stockQuantity) },
    { label: 'Нэгж үнэ', value: formatCurrency(product.defaultPrice) },
    { label: 'Хайрцагт', value: product.unitsPerBox ? `${product.unitsPerBox} ш` : '-' },
    { label: 'Хайрцагын үнэ', value: product.pricePerBox ? formatCurrency(product.pricePerBox) : '-' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={28} color={Colors.white} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {product.nameMongolian || product.nameEnglish}
            </Text>
            <View style={styles.badges}>
              <Badge
                label={product.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                variant={product.isActive ? 'success' : 'error'}
              />
              {product.stockQuantity < 10 && (
                <Badge label="Багтаамж бага" variant="warning" />
              )}
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stock Info */}
        <Card style={styles.stockCard}>
          <View style={styles.stockMain}>
            <Text style={styles.stockValue}>{product.stockQuantity}</Text>
            <Text style={styles.stockLabel}>үлдэгдэл</Text>
          </View>
          {product.unitsPerBox && (
            <View style={styles.stockSecondary}>
              <Text style={styles.stockSecondaryValue}>
                {Math.floor(product.stockQuantity / product.unitsPerBox)}
              </Text>
              <Text style={styles.stockSecondaryLabel}>хйрцаг</Text>
            </View>
          )}
        </Card>

        {/* Info Table */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Дэлгэрэнгүй</Text>
          <View style={styles.infoTable}>
            {infoRows.map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Prices by Customer Type */}
        {product.prices && product.prices.length > 0 && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Үнэ</Text>
            <View style={styles.infoTable}>
              {product.prices.map((priceItem) => (
                <View key={priceItem.customerTypeId} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {priceItem.customerType?.typeName || `Төрөл ${priceItem.customerTypeId}`}
                  </Text>
                  <Text style={styles.infoValue}>{formatCurrency(priceItem.price)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color={Colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={styles.deleteButtonText}>Бараа устгах</Text>
            </>
          )}
        </TouchableOpacity>
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  productName: {
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
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  stockMain: {
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  stockLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  stockSecondary: {
    alignItems: 'center',
  },
  stockSecondaryValue: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.foreground,
  },
  stockSecondaryLabel: {
    fontSize: FontSizes.sm,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  deleteButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.error,
  },
});
