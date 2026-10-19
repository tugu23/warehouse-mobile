import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/api/orders';
import { Order, OrderStatus } from '@/types';
import {
  formatCurrency,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@/constants/theme';
import { EBarimtPrintModal } from '@/components/ebarimt-print-modal';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEBarimtModal, setShowEBarimtModal] = useState(false);

  /**
   * Check if an order can be edited
   * Editable if:
   * - Order is pending
   * - eBarimt not registered yet
   * - Order is not cancelled
   */
  const canEditOrder = (orderData: Order): boolean => {
    return (
      orderData.status === 'Pending' &&
      !orderData.ebarimtRegistered &&
      orderData.status !== 'Cancelled'
    );
  };

  /**
   * Check if an order can be deleted based on eBarimt status
   * Deletable if:
   * - eBarimt not registered yet
   * - eBarimt has been returned
   * - Order is already cancelled
   */
  const canDeleteOrder = (orderData: Order): boolean => {
    return (
      !orderData.ebarimtRegistered ||
      orderData.ebarimtReturnId != null ||
      orderData.status === 'Cancelled'
    );
  };

  const handleDeleteOrder = () => {
    if (!order) return;

    // Шалгах: устгаж болох эсэх
    if (!canDeleteOrder(order)) {
      Alert.alert(
        'Устгах боломжгүй',
        'И-баримт хэвлэгдсэн идэвхтэй захиалгыг устгах боломжгүй. Эхлээд И-баримтыг буцаагаад дараа нь устгах уу.'
      );
      return;
    }

    Alert.alert(
      'Захиалга устгах',
      'Та энэ захиалгыг бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await ordersApi.deleteOrder(order.id);
              Alert.alert('Амжилттай', 'Захиалга устгагдлаа');
              router.back();
            } catch (error: any) {
              const message = error?.response?.data?.message || 'Захиалга устгахад алдаа гарлаа';
              Alert.alert('Алдаа', message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

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
      const data = await ordersApi.getOrder(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Алдаа', 'Захиалгыг ачаалж чадсангүй');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    Alert.alert(
      'Статус өөрчлөх',
      `Энэ захиалгыг "${newStatus === 'Fulfilled' ? 'Биелсэн' : newStatus === 'Delivered' ? 'Хүргэгдсэн' : 'Цуцлагдсан'}" болгох уу?`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Тийм',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const updated = await ordersApi.updateOrderStatus(order.id, newStatus);
              setOrder(updated);
            } catch (error) {
              Alert.alert('Алдаа', 'Статусыг өөрчилж чадсангүй');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Ачаалж байна...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeline = [
    { status: 'Pending', label: 'Үүсгэсэн', done: true },
    { status: 'Fulfilled', label: 'Биелсэн', done: order.status !== 'Pending' && order.status !== 'Cancelled' },
    { status: 'Delivered', label: 'Хүргэгдсэн', done: order.status === 'Delivered' },
  ];

  const vatAmount = order.vatAmount || Math.round((order.totalAmount || 0) * 0.1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>Захиалгын дэлгэрэнгүй</Text>
          <Text style={styles.orderNumber} numberOfLines={1}>{order.orderNumber || `Захиалга #${String(order.id)}`}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Customer & Status */}
        <Card style={styles.customerCard}>
          <Text style={styles.customerName} numberOfLines={2}>{order.customer?.name || 'Unknown Customer'}</Text>
          <View style={styles.badges}>
            <StatusBadge status={order.status} type="order" />
            <Text style={styles.dateText}>
              {order.orderDate ? new Date(order.orderDate).toLocaleDateString('mn-MN') : 'N/A'}
            </Text>
          </View>
          {/* И-баримт статус */}
          <View style={styles.ebarimtBadge}>
            {order.ebarimtReturnId ? (
              <Text style={styles.returnedBadge}>◉ Буцаагдсан</Text>
            ) : order.ebarimtRegistered ? (
              <Text style={styles.activeBadge}>◉ Идэвхтэй</Text>
            ) : (
              <Text style={styles.notRegisteredBadge}>○ Бүртгэлгүй</Text>
            )}
          </View>
        </Card>

        {/* Status Timeline */}
        {order.status !== 'Cancelled' && (
          <Card style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Захиалгын явц</Text>
            <View style={styles.timeline}>
              {timeline.map((step, index) => (
                <View key={step.status} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.done && styles.timelineDotDone,
                    ]}
                  >
                    {step.done && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </View>
                  {index < timeline.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        timeline[index + 1].done && styles.timelineLineDone,
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.timelineLabel,
                      step.done && styles.timelineLabelDone,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Order Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Захиалгын мэдээлэл</Text>
          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Захиалгын дугаар</Text>
              <Text style={styles.infoValue}>{order.orderNumber || `Захиалга #${String(order.id)}`}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Харилцагч</Text>
              <Text style={styles.infoValue}>{order.customer?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Огноо</Text>
              <Text style={styles.infoValue}>
                {order.orderDate ? new Date(order.orderDate).toLocaleDateString('mn-MN') : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Төрөл</Text>
              <Text style={styles.infoValue}>
                {order.orderType === 'Market' ? 'Зах' : 'Дэлгүүр'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Төлбөрийн хэлбэр</Text>
              <Text style={styles.infoValue}>{order.paymentMethod || 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Барааны жагсаалт</Text>
          {order.orderItems && order.orderItems.length > 0 ? (
            order.orderItems.map((item) => {
              if (!item) return null;

              const hasPromotion = item.promotion != null || item.originalUnitPrice != null;
              const isBuyXGetY = item.promotion?.type === 'BUY_X_GET_Y';

              const itemId = item.id ? String(item.id) : Math.random().toString();
              const productName = item.product?.nameMongolian ? String(item.product.nameMongolian) : `Бараа #${item.productId || 'N/A'}`;
              const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice || '0'));
              const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity || '0'), 10);
              const subtotal = typeof item.subtotal === 'number' ? item.subtotal : (unitPrice * quantity);

              return (
                <View key={itemId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{productName}</Text>
                    {hasPromotion && item.promotion && item.promotion.name ? (
                      <Text style={styles.promotionBadge}>🔥 {String(item.promotion.name)}</Text>
                    ) : null}
                    <Text style={styles.itemPrice}>{formatCurrency(unitPrice)} × {quantity}</Text>
                    {item.bonusFreeQty && Number(item.bonusFreeQty) > 0 ? (
                      <Text style={styles.bonusBadge}>🎁 +{Number(item.bonusFreeQty)} ширхэг үнэгүй</Text>
                    ) : null}
                    {item.promotion?.discountPercent ? (
                      <Text style={styles.discountBadge}>-{Number(item.promotion.discountPercent)}% хөнгөлөлт</Text>
                    ) : null}
                    {isBuyXGetY ? (
                      <Text style={styles.discountBadge}>
                        🎁 {item.promotion?.buyQty || 0}+{item.promotion?.freeQty || 0}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.itemTotalContainer}>
                    <Text style={styles.itemTotal}>{formatCurrency(subtotal)}</Text>
                    {item.discountAmount && Number(item.discountAmount) > 0 ? (
                      <Text style={styles.discountAmount}>-{formatCurrency(Number(item.discountAmount))}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.itemPrice}>Бараа байхгүй</Text>
          )}
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>VAT (10%)</Text>
            <Text style={styles.totalsValue}>{formatCurrency(Number(vatAmount ?? 0))}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Нийт дүн</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(order.totalAmount ?? 0))}</Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Э-Barimt"
            variant="secondary"
            onPress={() => setShowEBarimtModal(true)}
            leftIcon={<Ionicons name="receipt" size={18} color={Colors.primary} />}
            style={styles.actionButton}
          />
          {/* Edit button - only for pending orders without eBarimt */}
          {canEditOrder(order) && (
            <Button
              title="Засах"
              variant="secondary"
              onPress={() => router.push(`/orders/${order.id}/edit`)}
              leftIcon={<Ionicons name="create" size={18} color={Colors.primary} />}
              style={styles.actionButton}
            />
          )}
          {/* Устгах товчлуур - зөвхөн устгаж болох захиалгад */}
          {canDeleteOrder(order) && (
            <Button
              title="Устгах"
              variant="destructive"
              onPress={handleDeleteOrder}
              isLoading={isDeleting}
              leftIcon={<Ionicons name="trash" size={18} color={Colors.destructive} />}
              style={styles.actionButton}
            />
          )}
          {order.status === 'Pending' && (
            <>
              <Button
                title="Цуцлах"
                variant="outline"
                onPress={() => handleStatusUpdate('Cancelled')}
                disabled={isUpdating}
                style={styles.actionButton}
              />
              <Button
                title="Биелсэн болгох"
                onPress={() => handleStatusUpdate('Fulfilled')}
                isLoading={isUpdating}
                style={styles.actionButton}
              />
            </>
          )}
          {order.status === 'Fulfilled' && (
            <Button
              title="Хүргэгдсэн болгох"
              onPress={() => handleStatusUpdate('Delivered')}
              isLoading={isUpdating}
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>

      {/* E-Barimt Print Modal */}
      <EBarimtPrintModal
        visible={showEBarimtModal}
        order={order}
        onClose={() => setShowEBarimtModal(false)}
      />
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
    marginBottom: Spacing.sm,
  },
  headerContent: {
    gap: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  orderNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  customerCard: {
    margin: Spacing.md,
    marginBottom: 0,
    paddingVertical: Spacing.sm,
  },
  customerName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  // И-баримт статусын badge
  ebarimtBadge: {
    marginTop: Spacing.sm,
  },
  returnedBadge: {
    fontSize: FontSizes.sm,
    color: Colors.muted,
    fontWeight: '500',
  },
  activeBadge: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  notRegisteredBadge: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  timelineCard: {
    margin: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.muted,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timelineLine: {
    position: 'absolute',
    top: 13,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.muted,
    zIndex: -1,
  },
  timelineLineDone: {
    backgroundColor: Colors.primary,
  },
  timelineLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  timelineLabelDone: {
    color: Colors.primary,
  },
  infoCard: {
    margin: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: 0,
  },
  infoTable: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    flex: 1,
  },
  infoValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1.5,
    textAlign: 'right',
    numberOfLines: 2,
  },
  itemsCard: {
    margin: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  itemPrice: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  originalPrice: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    textDecorationLine: 'line-through',
  },
  promotionBadge: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  bonusBadge: {
    fontSize: FontSizes.xs,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 4,
  },
  discountBadge: {
    fontSize: FontSizes.xs,
    color: '#f97316',
    fontWeight: '600',
    marginTop: 4,
  },
  discountAmount: {
    fontSize: FontSizes.xs,
    color: '#22c55e',
    fontWeight: '600',
  },
  itemTotalContainer: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  totalsLabel: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
  totalsValue: {
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
  totalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  totalValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    margin: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  fullWidthButton: {
    flex: 1,
  },
});
