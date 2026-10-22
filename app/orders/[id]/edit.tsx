import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { Badge } from '@/components/ui/badge';
import { ordersApi } from '@/api/orders';
import { customersApi } from '@/api/customers';
import { productsApi } from '@/api/products';
import { Customer, Product, ProductPrice, UpdateOrderRequest, PaymentMethod, Promotion, Order } from '@/types';
import {
  formatCurrency,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  PaymentMethodLabels,
} from '@/constants/theme';

type PriceMode = 'customerType' | 'defaultPrice' | 'custom';

interface CartItem {
  product: Product;
  quantity: number;        // Ширхэгийн тоо
  boxQuantity: number;     // Хайрцагны тоо
  priceMode: PriceMode;
  customUnitPrice?: number;
  promotionId?: number;
}

type OrderItemRequest = UpdateOrderRequest['items'][number];

// Helper: get price for customer type
const getPriceForCustomerType = (
  product: Product,
  customerTypeId?: number
): number | null => {
  if (!customerTypeId || !product.prices) return null;
  const typePrice = product.prices.find((p) => p.customerTypeId === customerTypeId);
  return typePrice?.price ?? null;
};

// Helper: resolve customer type ID
const resolveCustomerTypeId = (customer?: Customer | null): number | undefined => {
  if (!customer) return undefined;
  return customer.customerType?.id ?? customer.customerTypeId ?? undefined;
};

// Helper: get active promotions for a product
const getActivePromotions = (product?: Product | null): Promotion[] => {
  if (!product?.promotions) return [];
  const now = new Date().getTime();
  return product.promotions.filter((promo) => {
    if (!promo.isActive) return false;
    const start = promo.startDate ? new Date(promo.startDate).getTime() : 0;
    const end = promo.endDate ? new Date(promo.endDate).getTime() : Number.MAX_SAFE_INTEGER;
    return start <= now && end >= now;
  });
};

// Helper: check if a promotion is applicable for given quantity
const isPromotionApplicable = (promo: Promotion, totalPieces: number): boolean => {
  if (promo.type === 'PERCENT_DISCOUNT') {
    const minQty = promo.minQuantity || 0;
    return totalPieces >= minQty;
  }
  return true;
};

// Helper: find the best applicable PERCENT_DISCOUNT promotion
const findBestPercentPromotion = (
  promotions: Promotion[],
  totalPieces: number
): Promotion | null => {
  const applicablePromos = promotions.filter(
    (p) => p.type === 'PERCENT_DISCOUNT' && isPromotionApplicable(p, totalPieces)
  );
  if (applicablePromos.length === 0) return null;
  return applicablePromos.reduce((best, current) => {
    const bestDiscount = best.discountPercent || 0;
    const currentDiscount = current.discountPercent || 0;
    return currentDiscount > bestDiscount ? current : best;
  });
};

// Helper: calculate bonus quantity for BUY_X_GET_Y promotions
const calculateBonusQty = (promotion?: Promotion | null, totalPieces?: number): number => {
  if (!promotion || promotion.type !== 'BUY_X_GET_Y' || !totalPieces) return 0;
  const buyQty = promotion.buyQty || 0;
  const freeQty = promotion.freeQty || 0;
  if (buyQty < 1 || freeQty < 1 || totalPieces < buyQty) return 0;
  return Math.floor(totalPieces / buyQty) * freeQty;
};

// Helper: format promotion label
const formatPromotionLabel = (promo: Promotion): string => {
  if (promo.type === 'BUY_X_GET_Y') {
    return `${promo.buyQty || 0}+${promo.freeQty || 0}`;
  } else if (promo.type === 'PERCENT_DISCOUNT') {
    return `${promo.discountPercent || 0}% ${promo.minQuantity ? `(≥${promo.minQuantity}ш)` : ''}`;
  }
  return promo.name;
};

export default function EditOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [creditTermDays, setCreditTermDays] = useState(30);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerTypeId = useMemo(
    () => resolveCustomerTypeId(selectedCustomer),
    [selectedCustomer]
  );
  const customerTypeName = useMemo(
    () => selectedCustomer?.customerType?.typeName || selectedCustomer?.customerType?.name || 'Төрөлгүй',
    [selectedCustomer]
  );

  // Load order data
  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    const orderId = Number(id);
    if (isNaN(orderId)) {
      Alert.alert('Алдаа', 'Захиалгын ID буруу байна');
      router.back();
      return;
    }

    try {
      const orderData = await ordersApi.getOrder(orderId);
      setOrder(orderData);

      // Pre-populate form with order data
      if (orderData.customer) {
        setSelectedCustomer(orderData.customer);
      }

      setPaymentMethod(orderData.paymentMethod || 'Cash');
      setCreditTermDays(orderData.creditTermDays || 30);
      if (orderData.deliveryDate) {
        setDeliveryDate(new Date(orderData.deliveryDate).toISOString().split('T')[0]);
      }

      // Convert order items to cart items - use product data already included in order
      if (orderData.orderItems && orderData.orderItems.length > 0) {
        const cartItems: CartItem[] = orderData.orderItems.flatMap(item => {
          const product = item.product;
          if (!product) return [];

          // Calculate box and piece quantities (simplified - assumes 1 unit per piece)
          const unitsPerBox = product.unitsPerBox || 1;
          const boxQuantity = Math.floor(item.quantity / unitsPerBox);
          const quantity = item.quantity % unitsPerBox;

          // Determine price mode based on unitPrice comparison
          let priceMode: PriceMode = 'defaultPrice';
          const customerTypePrice = customerTypeId
            ? getPriceForCustomerType(product, customerTypeId)
            : null;

          if (customerTypePrice !== null && Math.abs(item.unitPrice - customerTypePrice) < 1) {
            priceMode = 'customerType';
          } else if (Math.abs(item.unitPrice - product.defaultPrice) > 1) {
            priceMode = 'custom';
          }

          return [{
            product,
            quantity,
            boxQuantity,
            priceMode,
            customUnitPrice: priceMode === 'custom' ? item.unitPrice : undefined,
            promotionId: item.promotionId || undefined,
          }];
        });

        setCart(cartItems);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Алдаа', 'Захиалгыг ачаалж чадсангүй');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch customers when searching
  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustomers([]);
      return;
    }
    setIsLoadingCustomers(true);
    customersApi
      .getCustomers({ search: customerQuery, limit: 10 })
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoadingCustomers(false));
  }, [customerQuery]);

  // Fetch products when searching
  useEffect(() => {
    if (productQuery.length < 2) {
      setProducts([]);
      return;
    }
    setIsLoadingProducts(true);
    productsApi
      .getProducts({ search: productQuery, limit: 10 })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoadingProducts(false));
  }, [productQuery]);

  // Get selected promotion for a cart item
  const getSelectedPromotion = (item: CartItem): Promotion | null => {
    if (!item.promotionId) return null;
    return getActivePromotions(item.product).find((p) => p.id === item.promotionId) || null;
  };

  // Calculate unit price (considering promotions)
  const getUnitPrice = (item: CartItem): number => {
    const { product, priceMode, customUnitPrice } = item;

    if (priceMode === 'custom' && customUnitPrice) {
      return customUnitPrice;
    }

    let basePrice: number;
    if (priceMode === 'customerType') {
      const typePrice = getPriceForCustomerType(product, customerTypeId);
      basePrice = typePrice !== null ? typePrice : product.defaultPrice;
    } else {
      basePrice = product.defaultPrice;
    }

    const promo = getSelectedPromotion(item);
    const totalPieces = getTotalPieces(item);
    if (promo?.type === 'PERCENT_DISCOUNT' && promo.discountPercent) {
      if (isPromotionApplicable(promo, totalPieces)) {
        return Math.round(basePrice * (1 - promo.discountPercent / 100));
      }
    }

    return basePrice;
  };

  const getBonusQuantity = (item: CartItem): number => {
    const promo = getSelectedPromotion(item);
    const totalPieces = getTotalPieces(item);
    return calculateBonusQty(promo, totalPieces);
  };

  const getTotalPieces = (item: CartItem): number => {
    const unitsPerBox = item.product.unitsPerBox || 1;
    return item.quantity + (item.boxQuantity * unitsPerBox);
  };

  const getLineSubtotal = (item: CartItem): number => {
    const totalPieces = getTotalPieces(item);
    return getUnitPrice(item) * totalPieces;
  };

  const getTotalQuantity = (item: CartItem): number => {
    return getTotalPieces(item) + getBonusQuantity(item);
  };

  const getAvailablePriceModes = (product: Product): PriceMode[] => {
    const modes: PriceMode[] = ['defaultPrice'];
    if (customerTypeId && getPriceForCustomerType(product, customerTypeId) !== null) {
      modes.unshift('customerType');
    }
    modes.push('custom');
    return modes;
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const modes = getAvailablePriceModes(product);
    const defaultMode: PriceMode = modes.includes('customerType') ? 'customerType' : 'defaultPrice';

    const activePromos = getActivePromotions(product);
    let promotionId: number | undefined;
    if (activePromos.length === 1) {
      promotionId = activePromos[0].id;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        { product, quantity: 1, boxQuantity: 0, priceMode: defaultMode, customUnitPrice: undefined, promotionId },
      ]);
    }
    setProductQuery('');
    setProducts([]);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0 || item.boxQuantity > 0)
    );
  };

  const updateBoxQuantity = (productId: number, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product.id === productId
            ? { ...item, boxQuantity: Math.max(0, item.boxQuantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0 || item.boxQuantity > 0)
    );
  };

  const updatePriceMode = (productId: number, priceMode: PriceMode) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? { ...item, priceMode, customUnitPrice: priceMode === 'custom' ? item.customUnitPrice : undefined }
          : item
      )
    );
  };

  const updateCustomPrice = (productId: number, price: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, customUnitPrice: price } : item
      )
    );
  };

  const updatePromotion = (productId: number, promotionId?: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, promotionId } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + getLineSubtotal(item), 0);
  const vatAmount = Math.round((subtotal / 1.1) * 0.1);
  const total = subtotal;

  // Total bonus items count
  const totalBonusItems = cart.reduce((sum, item) => sum + getBonusQuantity(item), 0);

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0 || !order) {
      Alert.alert('Алдаа', 'Харилцагч сонгох болон бараа нэмэх шаардлагатай');
      return;
    }

    setIsSubmitting(true);
    try {
      const items: OrderItemRequest[] = cart.map((item) => ({
        productId: item.product.id,
        quantity: getTotalPieces(item),
        priceMode: item.priceMode,
        customUnitPrice: item.priceMode === 'custom' ? item.customUnitPrice : undefined,
        promotionId: item.promotionId,
      }));

      const orderData: UpdateOrderRequest = {
        customerId: selectedCustomer.id,
        items,
        paymentMethod,
        creditTermDays: paymentMethod === 'Credit' ? creditTermDays : undefined,
        orderType: order.orderType || 'Store',
        deliveryDate,
      };

      await ordersApi.updateOrder(order.id, orderData);

      Alert.alert('Амжилттай', 'Захиалга амжилттай засагдлаа', [
        {
          text: 'OK',
          onPress: () => router.replace(`/orders/${order.id}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Захиалга засах чадсангүй');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods: PaymentMethod[] = ['Cash', 'BankTransfer', 'Credit', 'Padan'];
  const priceModeOptions: Array<{ key: PriceMode; label: string }> = [
    { key: 'customerType', label: 'Төрлийн үнэ' },
    { key: 'defaultPrice', label: 'Үндсэн үнэ' },
    { key: 'custom', label: 'Гараар' },
  ];

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Захиалга засах</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!selectedCustomer || cart.length === 0 || isSubmitting}
          style={[
            styles.submitButton,
            (!selectedCustomer || cart.length === 0) && styles.submitButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.submitButtonText,
              (!selectedCustomer || cart.length === 0) && styles.submitButtonTextDisabled,
            ]}
          >
            Хадгалах
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Order Info Banner */}
          <Card style={styles.orderBanner}>
            <Text style={styles.orderBannerTitle}>
              {order.orderNumber || `Захиалга #${order.id}`}
            </Text>
            <Text style={styles.orderBannerSubtitle}>
              {order.status === 'Pending' ? 'Хүлээгдэж буй' : order.status}
            </Text>
          </Card>

          {/* Customer Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Харилцагч</Text>
            {selectedCustomer ? (
              <Card style={styles.selectedCustomer}>
                <View style={styles.selectedCustomerInfo}>
                  <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedCustomerDetail}>
                    {selectedCustomer.district} · {selectedCustomer.phoneNumber}
                  </Text>
                  <Badge
                    label={customerTypeName}
                    variant={customerTypeId ? 'primary' : 'secondary'}
                  />
                </View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.muted} />
                </TouchableOpacity>
              </Card>
            ) : (
              <SearchBar
                value={customerQuery}
                onChangeText={setCustomerQuery}
                placeholder="Харилцагч хайх..."
              />
            )}

            {customerQuery.length >= 2 && !selectedCustomer && (
              <View style={styles.searchResults}>
                {isLoadingCustomers ? (
                  <Text style={styles.loadingText}>Хайж байна...</Text>
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSelectedCustomer(customer);
                        setCustomerQuery('');
                        setCustomers([]);
                      }}
                    >
                      <View style={styles.searchResultHeader}>
                        <Text style={styles.searchResultName}>{customer.name}</Text>
                        <Badge
                          label={customer.customerType?.typeName || customer.customerType?.name || 'Төрөлгүй'}
                          variant="secondary"
                        />
                      </View>
                      <Text style={styles.searchResultDetail}>
                        {customer.district} · {customer.phoneNumber}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResults}>Харилцагч олдсонгүй</Text>
                )}
              </View>
            )}
          </View>

          {/* Products */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Бараа</Text>
            <SearchBar
              value={productQuery}
              onChangeText={setProductQuery}
              placeholder="Бараа хайх..."
            />

            {/* Product Search Results */}
            {productQuery.length >= 2 && (
              <View style={styles.searchResults}>
                {isLoadingProducts ? (
                  <Text style={styles.loadingText}>Хайж байна...</Text>
                ) : products.length > 0 ? (
                  products.map((product) => {
                    const inCart = cart.find((item) => item.product.id === product.id);
                    const activePromos = getActivePromotions(product);
                    const typePrice = customerTypeId
                      ? getPriceForCustomerType(product, customerTypeId)
                      : null;

                    return (
                      <TouchableOpacity
                        key={product.id}
                        style={[styles.searchResultItem, inCart && styles.searchResultItemInCart]}
                        onPress={() => addToCart(product)}
                      >
                        <View style={styles.searchResultHeader}>
                          <Text style={styles.searchResultName}>{product.nameMongolian}</Text>
                          <View style={styles.searchResultBadges}>
                            <Badge
                              label={`${product.stockQuantity}ш`}
                              variant={product.stockQuantity > 100 ? 'success' : 'warning'}
                            />
                            {activePromos.length > 0 && (
                              <Badge
                                label={`🔥 ${activePromos.length} урамшуулал`}
                                variant="promotion"
                              />
                            )}
                          </View>
                        </View>
                        <View style={styles.priceRow}>
                          {typePrice !== null && (
                            <Text style={styles.typePrice}>
                              {customerTypeName}: {formatCurrency(typePrice)}
                            </Text>
                          )}
                          <Text style={styles.searchResultPrice}>
                            {formatCurrency(product.defaultPrice)}
                          </Text>
                        </View>
                        {inCart && (
                          <Text style={styles.inCartText}>Сагсанд байгаа</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.noResults}>Бараа олдсонгүй</Text>
                )}
              </View>
            )}

            {/* Cart */}
            {cart.length > 0 && !productQuery && (
              <View style={styles.cart}>
                <Text style={styles.cartTitle}>Сагс ({cart.length} бараа)</Text>
                {cart.map((item) => {
                  const unitPrice = getUnitPrice(item);
                  const lineSubtotal = getLineSubtotal(item);
                  const availableModes = getAvailablePriceModes(item.product);
                  const activePromos = getActivePromotions(item.product);
                  const selectedPromo = getSelectedPromotion(item);
                  const bonusQty = getBonusQuantity(item);
                  const totalQty = getTotalQuantity(item);
                  const typePrice = customerTypeId
                    ? getPriceForCustomerType(item.product, customerTypeId)
                    : null;

                  return (
                    <View key={item.product.id} style={styles.cartItem}>
                      <View style={styles.cartItemHeader}>
                        <Text style={styles.cartItemName}>{item.product.nameMongolian}</Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </View>

                      {/* Stock Info */}
                      <View style={styles.stockRow}>
                        <Text style={styles.stockText}>
                          Үлдэгдэл: {item.product.stockQuantity}ш
                        </Text>
                        {totalQty > item.product.stockQuantity && (
                          <Text style={styles.stockWarning}>⚠ Үлдэгдэл хүрэлцэхгүй!</Text>
                        )}
                      </View>

                      {/* Price Mode Selection */}
                      <View style={styles.priceModeContainer}>
                        {priceModeOptions
                          .filter((opt) => availableModes.includes(opt.key))
                          .map((opt) => (
                            <TouchableOpacity
                              key={opt.key}
                              style={[
                                styles.priceModeButton,
                                item.priceMode === opt.key && styles.priceModeButtonActive,
                              ]}
                              onPress={() => updatePriceMode(item.product.id, opt.key)}
                            >
                              <Text
                                style={[
                                  styles.priceModeText,
                                  item.priceMode === opt.key && styles.priceModeTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>

                      {/* Price Display */}
                      <View style={styles.priceDisplay}>
                        <Text style={styles.unitPrice}>
                          Нэгж үнэ:{' '}
                          {item.priceMode === 'custom' ? (
                            <TextInput
                              style={styles.customPriceInput}
                              value={item.customUnitPrice?.toString() || ''}
                              onChangeText={(text) => {
                                const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                if (!isNaN(num)) {
                                  updateCustomPrice(item.product.id, num);
                                }
                              }}
                              keyboardType="number-pad"
                              placeholder="0"
                            />
                          ) : (
                            formatCurrency(unitPrice)
                          )}
                        </Text>
                        {selectedPromo?.type === 'PERCENT_DISCOUNT' && (
                          <Text style={styles.promotionBadge}>
                            🔥 {selectedPromo.discountPercent}% хөнгөлөлт
                          </Text>
                        )}
                      </View>

                      {/* Promotion Selection */}
                      {activePromos.length > 0 && (
                        <View style={styles.promotionSection}>
                          <Text style={styles.promotionLabel}>Урамшуулал:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.promotionButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.promotionButton,
                                  !item.promotionId && styles.promotionButtonActive,
                                ]}
                                onPress={() => updatePromotion(item.product.id, undefined)}
                              >
                                <Text
                                  style={[
                                    styles.promotionButtonText,
                                    !item.promotionId && styles.promotionButtonTextActive,
                                  ]}
                                >
                                  Хоосон
                                </Text>
                              </TouchableOpacity>
                              {activePromos.map((promo) => {
                                const isApplicable = isPromotionApplicable(promo, totalQty);
                                const isSelected = item.promotionId === promo.id;
                                return (
                                  <TouchableOpacity
                                    key={promo.id}
                                    style={[
                                      styles.promotionButton,
                                      isSelected && styles.promotionButtonActive,
                                      !isApplicable && styles.promotionButtonDisabled,
                                    ]}
                                    onPress={() => isApplicable && updatePromotion(item.product.id, promo.id)}
                                  >
                                    <Text
                                      style={[
                                        styles.promotionButtonText,
                                        isSelected && styles.promotionButtonTextActive,
                                        !isApplicable && styles.promotionButtonTextDisabled,
                                      ]}
                                    >
                                      {promo.type === 'BUY_X_GET_Y'
                                        ? `🎁 ${promo.buyQty}+${promo.freeQty}`
                                        : `🔥 ${promo.discountPercent}%${promo.minQuantity ? ` (≥${promo.minQuantity})` : ''}`
                                      }
                                    </Text>
                                    {!isApplicable && (
                                      <Text style={styles.promotionMinQty}>
                                        {totalQty}/{promo.minQuantity}ш
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* Bonus Info */}
                      {bonusQty > 0 && (
                        <View style={styles.bonusRow}>
                          <Text style={styles.bonusText}>
                            🎁 +{bonusQty} ширхэг үнэгүй (нийт {totalQty} ш)
                          </Text>
                        </View>
                      )}

                      {/* Quantity Control - Pieces and Boxes */}
                      <View style={styles.quantitySection}>
                        <Text style={styles.quantityLabel}>Тоо хэмжээ:</Text>
                        <View style={styles.quantityRow}>
                          {/* Box Quantity */}
                          <View style={styles.quantityField}>
                            <Text style={styles.quantityFieldLabel}>
                              Хайрцаг ({item.product.unitsPerBox || 1}ш)
                            </Text>
                            <View style={styles.quantityControlSmall}>
                              <TouchableOpacity
                                style={styles.quantityButtonSmall}
                                onPress={() => updateBoxQuantity(item.product.id, -1)}
                              >
                                <Text style={styles.quantityButtonTextSmall}>−</Text>
                              </TouchableOpacity>
                              <TextInput
                                style={styles.quantityInputSmall}
                                value={String(item.boxQuantity)}
                                onChangeText={(text) => {
                                  const num = parseInt(text, 10);
                                  if (text === '' || isNaN(num)) {
                                    setCart(
                                      cart.map((c) =>
                                        c.product.id === item.product.id
                                          ? { ...c, boxQuantity: 0 }
                                          : c
                                      )
                                    );
                                  } else if (num >= 0) {
                                    setCart(
                                      cart.map((c) =>
                                        c.product.id === item.product.id
                                          ? { ...c, boxQuantity: num }
                                          : c
                                      )
                                    );
                                  }
                                }}
                                keyboardType="number-pad"
                              />
                              <TouchableOpacity
                                style={[styles.quantityButtonSmall, styles.quantityButtonSmallAdd]}
                                onPress={() => updateBoxQuantity(item.product.id, 1)}
                              >
                                <Text style={[styles.quantityButtonTextSmall, styles.quantityButtonTextSmallAdd]}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Piece Quantity */}
                          <View style={styles.quantityField}>
                            <Text style={styles.quantityFieldLabel}>Ширхэг</Text>
                            <View style={styles.quantityControlSmall}>
                              <TouchableOpacity
                                style={styles.quantityButtonSmall}
                                onPress={() => updateQuantity(item.product.id, -1)}
                              >
                                <Text style={styles.quantityButtonTextSmall}>−</Text>
                              </TouchableOpacity>
                              <TextInput
                                style={styles.quantityInputSmall}
                                value={String(item.quantity)}
                                onChangeText={(text) => {
                                  const num = parseInt(text, 10);
                                  if (text === '') {
                                    setCart(
                                      cart.map((c) =>
                                        c.product.id === item.product.id
                                          ? { ...c, quantity: 0 }
                                          : c
                                      )
                                    );
                                  } else if (!isNaN(num) && num >= 0) {
                                    setCart(
                                      cart.map((c) =>
                                        c.product.id === item.product.id
                                          ? { ...c, quantity: num }
                                          : c
                                      )
                                    );
                                  }
                                }}
                                keyboardType="number-pad"
                              />
                              <TouchableOpacity
                                style={[styles.quantityButtonSmall, styles.quantityButtonSmallAdd]}
                                onPress={() => updateQuantity(item.product.id, 1)}
                              >
                                <Text style={[styles.quantityButtonTextSmall, styles.quantityButtonTextSmallAdd]}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Total Pieces */}
                          <View style={styles.totalPieces}>
                            <Text style={styles.totalPiecesLabel}>Нийт</Text>
                            <Text style={styles.totalPiecesValue}>{getTotalPieces(item)} ш</Text>
                          </View>
                        </View>
                      </View>

                      {/* Line Subtotal */}
                      <View style={styles.lineSubtotalRow}>
                        <Text style={styles.lineSubtotalLabel}>Дүн:</Text>
                        <Text style={styles.lineSubtotal}>{formatCurrency(lineSubtotal)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Summary */}
          {cart.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Тооцоо</Text>
                <Card>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Барааны дүн (НӨАТ-гүй)</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(subtotal - vatAmount)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>НӨАТ (10%)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(vatAmount)}</Text>
                  </View>
                  {totalBonusItems > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>🎁 Бонус бараа</Text>
                      <Text style={styles.bonusSummaryValue}>+{totalBonusItems} ширхэг үнэгүй</Text>
                    </View>
                  )}
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Нийт дүн</Text>
                    <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
                  </View>
                </Card>
              </View>

              {/* Payment Method */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Төлбөрийн хэлбэр</Text>
                <View style={styles.paymentMethods}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethod,
                        paymentMethod === method && styles.paymentMethodSelected,
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.paymentMethodText,
                          paymentMethod === method && styles.paymentMethodTextSelected,
                        ]}
                      >
                        {PaymentMethodLabels[method]}
                      </Text>
                      {paymentMethod === method && (
                        <Ionicons name="checkmark" size={16} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Credit Term */}
              {paymentMethod === 'Credit' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Зээлийн хугацаа (хоног)</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={String(creditTermDays)}
                    onChangeText={(text) => setCreditTermDays(parseInt(text, 10) || 0)}
                    keyboardType="number-pad"
                    placeholder="30"
                  />
                </View>
              )}

              {/* Delivery Date */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Хүргэлтийн огноо</Text>
                <TextInput
                  style={styles.dateInput}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </>
          )}

          {/* Submit Button */}
          <Button
            title="Захиалга хадгалах"
            onPress={handleSubmit}
            disabled={!selectedCustomer || cart.length === 0 || isSubmitting}
            isLoading={isSubmitting}
            style={styles.submitFullButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  submitButtonTextDisabled: {
    color: Colors['muted-foreground'],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  orderBanner: {
    backgroundColor: Colors.secondary,
    marginBottom: Spacing.lg,
  },
  orderBannerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  orderBannerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  selectedCustomerInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  selectedCustomerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  selectedCustomerDetail: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  searchResults: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  searchResultItem: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchResultItemInCart: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  searchResultBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  searchResultName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  searchResultDetail: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  typePrice: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  searchResultPrice: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.foreground,
  },
  noResults: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    paddingVertical: Spacing.md,
  },
  inCartText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  cart: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  cartTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    marginBottom: Spacing.sm,
  },
  cartItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cartItemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stockText: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  stockWarning: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    fontWeight: '600',
  },
  priceModeContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  priceModeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  priceModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priceModeText: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    fontWeight: '500',
  },
  priceModeTextActive: {
    color: Colors.white,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  unitPrice: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
    fontWeight: '600',
  },
  promotionBadge: {
    fontSize: FontSizes.xs,
    color: '#ff6b35',
    fontWeight: '700',
  },
  customPriceInput: {
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    minWidth: 80,
    textAlign: 'right',
    color: Colors.foreground,
    fontWeight: '600',
  },
  promotionSection: {
    marginBottom: Spacing.sm,
  },
  promotionLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  promotionButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  promotionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minWidth: 70,
    alignItems: 'center',
  },
  promotionButtonActive: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  promotionButtonDisabled: {
    backgroundColor: Colors.muted,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  promotionButtonText: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    fontWeight: '600',
  },
  promotionButtonTextActive: {
    color: Colors.white,
  },
  promotionButtonTextDisabled: {
    color: Colors['muted-foreground'],
    opacity: 0.6,
  },
  promotionMinQty: {
    fontSize: 9,
    color: Colors.error,
    marginTop: 2,
  },
  bonusRow: {
    backgroundColor: '#22c55e20',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  bonusText: {
    fontSize: FontSizes.sm,
    color: '#22c55e',
    fontWeight: '700',
  },
  quantitySection: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  quantityLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityField: {
    flex: 1,
  },
  quantityFieldLabel: {
    fontSize: FontSizes.xs,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  quantityControlSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  quantityButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonSmallAdd: {
    backgroundColor: Colors.primary,
  },
  quantityButtonTextSmall: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.foreground,
  },
  quantityButtonTextSmallAdd: {
    color: Colors.white,
  },
  quantityInputSmall: {
    width: 40,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  totalPieces: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  totalPiecesLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  totalPiecesValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  lineSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineSubtotalLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  lineSubtotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
  summaryValue: {
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
  bonusSummaryValue: {
    fontSize: FontSizes.md,
    color: '#22c55e',
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  summaryTotalValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  paymentMethodSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  paymentMethodText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.foreground,
  },
  paymentMethodTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
  submitFullButton: {
    marginTop: Spacing.md,
  },
});
