import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ebarimtApi } from '@/api/ebarimt';
import { printReceipt, shareReceipt, getReceiptHtml } from '@/services/receiptPrintService';
import { formatCurrency, Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    customerDistrict?: string;
    subtotal: string;
    vatAmount: string;
    totalAmount: string;
    paymentMethod: string;
    items?: string;
  }>();

  // Parse items from params
  const orderItems = params.items ? JSON.parse(params.items) : [];

  const [barimtType, setBarimtType] = useState<'B2C' | 'B2B' | null>(null);
  const [regNo, setRegNo] = useState('');
  const [citizenReg, setCitizenReg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [eBarimtResult, setEBarimtResult] = useState<{
    success: boolean;
    lottery?: string;
    ebarimtBillId?: string;
    qrData?: string;
  } | null>(null);

  const customerName = params.customerName || 'Харилцагч';
  const subtotal = parseFloat(params.subtotal || '0');
  const vatAmount = parseFloat(params.vatAmount || '0');
  const totalAmount = parseFloat(params.totalAmount || '0');

  // Prepare receipt data for printing (with eBarimt info if available)
  const getReceiptData = () => ({
    orderId: Number(params.orderId),
    customerName,
    customerPhone: params.customerPhone || undefined,
    customerAddress: params.customerDistrict || undefined,
    items: orderItems,
    subtotal,
    vatAmount,
    totalAmount,
    paymentMethod: params.paymentMethod || 'Cash',
    eReceiptNumber: eBarimtResult?.lottery || undefined,
    eReceiptId: eBarimtResult?.ebarimtBillId || undefined,
  });

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const data = getReceiptData();
      await printReceipt(data);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Алдаа', 'Хэвлэхэд алдаа гарлаа');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsPrinting(true);
    try {
      const data = getReceiptData();
      await shareReceipt(data);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Алдаа', 'Хуваалцахад алдаа гарлаа');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSubmit = async () => {
    if (!barimtType) {
      Alert.alert('Алдаа', 'И-Баримт төрөл сонгоно уу');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build request body based on type. The backend expects `customerTin`
      // as an override and falls back to the order's own registration number.
      const body = barimtType === 'B2B'
        ? { customerTin: regNo }
        : { customerTin: citizenReg };

      const result = await ebarimtApi.register(Number(params.orderId), body);

      if (result.success) {
        // Store result for printing/sharing
        setEBarimtResult({
          success: true,
          lottery: result.lottery,
          ebarimtBillId: result.ebarimtBillId || result.billId,
          qrData: result.qrData,
        });

        Alert.alert(
          'Амжилт',
          `И-Баримт амжилттай илгээгдлээ\n\n${result.lottery ? `Сугалаа: ${result.lottery}` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/orders'),
            },
          ]
        );
      } else {
        Alert.alert('Алдаа', result.message || 'И-Баримт илгээх чадсангүй');
      }
    } catch (error: any) {
      console.error('eBarimt error:', error);
      // 400 алдаа гарвал деталтай мэдээлэл харуулъя
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Серверт холбогдоход алдаа гарлаа';
      Alert.alert('Алдаа', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Баримтгүй үргэлжлэх',
      'И-Баримтгүйгээр үргэлжлэх үү?',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Тийм',
          onPress: () => {
            router.replace('/(tabs)/orders');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Баримт хэвлэх</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* eBarimt Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>И-Баримт төрөл</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                barimtType === 'B2C' && styles.typeButtonSelected,
              ]}
              onPress={() => setBarimtType('B2C')}
            >
              <Text style={styles.typeEmoji}>👤</Text>
              <View style={styles.typeInfo}>
                <Text
                  style={[
                    styles.typeTitle,
                    barimtType === 'B2C' && styles.typeTitleSelected,
                  ]}
                >
                  Иргэн
                </Text>
                <Text style={styles.typeSubtitle}>B2C баримт</Text>
              </View>
              {barimtType === 'B2C' && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                barimtType === 'B2B' && styles.typeButtonSelected,
              ]}
              onPress={() => setBarimtType('B2B')}
            >
              <Text style={styles.typeEmoji}>🏢</Text>
              <View style={styles.typeInfo}>
                <Text
                  style={[
                    styles.typeTitle,
                    barimtType === 'B2B' && styles.typeTitleSelected,
                  ]}
                >
                  Байгууллага
                </Text>
                <Text style={styles.typeSubtitle}>B2B баримт</Text>
              </View>
              {barimtType === 'B2B' && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* B2C Input */}
        {barimtType === 'B2C' && (
          <Card style={styles.inputCard}>
            <Text style={styles.inputLabel}>
              Иргэний регистрийн дугаар{' '}
              <Text style={styles.inputOptional}>(заавал биш)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={citizenReg}
              onChangeText={setCitizenReg}
              placeholder="УБ12345678"
              placeholderTextColor={Colors['muted-foreground']}
              maxLength={10}
              autoCapitalize="characters"
            />
            <Text style={styles.inputHint}>
              НӨАТ буцаан олгохын тулд регистрийн дугаараа оруулна уу
            </Text>
          </Card>
        )}

        {/* B2B Input */}
        {barimtType === 'B2B' && (
          <Card style={styles.inputCard}>
            <Text style={styles.inputLabel}>
              Байгууллагын регистрийн дугаар{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={regNo}
              onChangeText={setRegNo}
              placeholder="1234567"
              placeholderTextColor={Colors['muted-foreground']}
              maxLength={7}
              keyboardType="number-pad"
            />
          </Card>
        )}

        {/* Receipt Preview */}
        {barimtType && (
          <Card style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>
                {barimtType === 'B2B' && regNo ? `РД: ${regNo}` : customerName}
              </Text>
              <Text style={styles.receiptInfo}>
                <Text style={styles.receiptBold}>ТТД:</Text> 5001001234
              </Text>
              <Text style={styles.receiptInfo}>
                <Text style={styles.receiptBold}>Огноо:</Text>{' '}
                {new Date().toLocaleDateString('mn-MN')}
              </Text>
            </View>

            {/* Items */}
            <View style={styles.receiptItems}>
              <View style={styles.receiptItemHeader}>
                <Text style={[styles.receiptItemHeaderText, { flex: 1 }]}>Бараа</Text>
                <Text style={styles.receiptItemHeaderText}>Т/ш</Text>
                <Text style={styles.receiptItemHeaderText}>Дүн</Text>
              </View>
              {orderItems.length > 0 ? (
                orderItems.map((item: any, index: number) => (
                  <View key={index} style={styles.receiptItem}>
                    <Text style={[styles.receiptItemName, { flex: 1 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.receiptItemQty}>{item.quantity}</Text>
                    <Text style={styles.receiptItemAmount}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.receiptItem}>
                  <Text style={[styles.receiptItemName, { flex: 1 }]}>
                    Захиалгын бараанууд
                  </Text>
                  <Text style={styles.receiptItemQty}>-</Text>
                  <Text style={styles.receiptItemAmount}>
                    {formatCurrency(subtotal)}
                  </Text>
                </View>
              )}
            </View>

            {/* Totals */}
            <View style={styles.receiptTotals}>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Нийт үнэ</Text>
                <Text style={styles.receiptTotalValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>НӨАТ (10%)</Text>
                <Text style={styles.receiptTotalValue}>
                  {formatCurrency(vatAmount)}
                </Text>
              </View>
              <View style={styles.receiptGrandTotal}>
                <Text style={styles.receiptGrandTotalLabel}>Бүгд үнэ</Text>
                <Text style={styles.receiptGrandTotalValue}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>
            </View>

            {/* QR Code and Lottery */}
            <View style={styles.receiptFooter}>
              {eBarimtResult?.lottery ? (
                <>
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                  </View>
                  <View style={styles.lotteryInfo}>
                    <Text style={styles.lotteryLabel}>И-Баримт баталгаажлаа</Text>
                    <Text style={styles.lotteryNumber}>{eBarimtResult.lottery}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={48} color={Colors.foreground} />
                  </View>
                  <View style={styles.lotteryInfo}>
                    <Text style={styles.lotteryLabel}>Сугалаа</Text>
                    <Text style={styles.lotteryNumber}>
                      {barimtType === 'B2B' && regNo
                        ? `${regNo}-${new Date().getTime().toString().slice(-6)}`
                        : 'И-Баримт илгээхэд гарж ирнэ'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        {barimtType && (
          <>
            {/* Print and Share Buttons */}
            <View style={styles.printActions}>
              <TouchableOpacity
                style={styles.printButton}
                onPress={handlePrint}
                disabled={isPrinting}
              >
                <Ionicons name="print-outline" size={20} color={Colors.primary} />
                <Text style={styles.printButtonText}>Хэвлэх</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.printButton}
                onPress={handleShare}
                disabled={isPrinting}
              >
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
                <Text style={styles.printButtonText}>Хуваалцах</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="И-Баримт илгээх"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </>
        )}

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Баримтгүй үргэлжлэх</Text>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
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
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  typeButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.foreground,
  },
  typeTitleSelected: {
    color: Colors.primary,
  },
  typeSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  inputCard: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    marginBottom: Spacing.xs,
  },
  inputOptional: {
    fontWeight: '400',
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  inputHint: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  receiptCard: {
    marginBottom: Spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  receiptHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderStyle: 'dashed',
  },
  receiptTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  receiptInfo: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  receiptBold: {
    fontWeight: '600',
  },
  receiptItems: {
    padding: Spacing.md,
  },
  receiptItemHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  receiptItemHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textAlign: 'right',
    width: 60,
  },
  receiptItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
  },
  receiptItemName: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
  },
  receiptItemQty: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
    textAlign: 'right',
    width: 60,
    fontVariant: ['tabular-nums'],
  },
  receiptItemAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'right',
    width: 80,
    fontVariant: ['tabular-nums'],
  },
  receiptTotals: {
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  receiptTotalLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  receiptTotalValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  receiptGrandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  receiptGrandTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  receiptGrandTotalValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  receiptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  qrPlaceholder: {
    padding: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  lotteryInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lotteryLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  lotteryNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: 2,
  },
  submitButton: {
    marginBottom: Spacing.md,
  },
  printActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  printButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
});
