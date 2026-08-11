import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ebarimtApi, validateRegistrationNumber } from '@/api/ebarimt';
import { addToApiQueue } from '@/services/offline-queue';
import { printReceipt, shareReceipt } from '@/services/receiptPrintService';
import { EBarimtStatus, EBarimtRegisterResult, Order, EBarimtType } from '@/types';
import {
  formatCurrency,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@/constants/theme';

/**
 * Validate consumer number format for B2C
 * 8 digits: accepted
 * 10-12 digits: accepted
 * Other: returns null (backend generates)
 */
function validateConsumerNo(consumerNo: string): { valid: boolean; error?: string } {
  const trimmed = consumerNo.trim();

  // Empty is valid (backend will generate)
  if (!trimmed) {
    return { valid: true };
  }

  // 8 digits
  if (/^\d{8}$/.test(trimmed)) {
    return { valid: true };
  }

  // 10-12 digits
  if (/^\d{10,12}$/.test(trimmed)) {
    return { valid: true };
  }

  // Citizen format with letters (e.g., АБ12345678)
  if (/^[A-Za-zА-Яа-яЁёӨөҮү]{2}\d{8}$/.test(trimmed)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Иргэний регистр 8 орон, 10-12 орон, эсвэл ЭСҮҮЛ+8 тоо байх ёстой',
  };
}

interface EBarimtPrintModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess?: (result: EBarimtRegisterResult) => void;
}

type EBarimtStep = 'select' | 'loading' | 'success' | 'error';

export function EBarimtPrintModal({
  visible,
  order,
  onClose,
  onSuccess,
}: EBarimtPrintModalProps) {
  const [step, setStep] = useState<EBarimtStep>('select');
  const [customerNo, setCustomerNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isB2B, setIsB2B] = useState(false);
  const [printTwoCopies, setPrintTwoCopies] = useState(true);
  const [result, setResult] = useState<EBarimtRegisterResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [orgInfo, setOrgInfo] = useState<{ name: string; tin: string } | null>(null);

  useEffect(() => {
    if (visible && order) {
      setStep('select');
      setCustomerNo('');
      setCustomerName('');
      setIsB2B(false);
      setPrintTwoCopies(true);
      setResult(null);
      setError('');
      setOrgInfo(null);
      setValidationError('');
      checkOnlineStatus();
    }
  }, [visible, order]);

  const checkOnlineStatus = async () => {
    try {
      const status = await ebarimtApi.getStatus();
      setIsOnline(status.online);
    } catch {
      setIsOnline(false);
    }
  };

  /**
   * Handle customer number change with validation
   */
  const handleCustomerNoChange = async (value: string) => {
    setCustomerNo(value);
    setValidationError('');
    setOrgInfo(null);

    if (!value.trim()) return;

    if (isB2B) {
      // Validate and lookup organization for B2B
      const validation = validateRegistrationNumber(value);
      if (!validation.valid) {
        setValidationError(validation.error || 'Буруу формат');
        return;
      }

      // Auto-lookup organization info
      setIsLookingUp(true);
      try {
        const info = await ebarimtApi.getEbarimtInfoByTin(value);
        setOrgInfo(info);
        setCustomerName(info.name);
      } catch (err: any) {
        // Try by registration number if TIN lookup fails
        try {
          const org = await ebarimtApi.lookupEbarimtByRegNo(value);
          setOrgInfo({ name: org.name, tin: org.tin });
          setCustomerName(org.name);
        } catch {
          // Let user proceed - registration number will be sent to backend
        }
      } finally {
        setIsLookingUp(false);
      }
    } else {
      // Validate consumer number for B2C
      const validation = validateConsumerNo(value);
      if (!validation.valid) {
        setValidationError(validation.error || 'Буруу формат');
      }
    }
  };

  /**
   * Handle B2B/B2C toggle
   */
  const handleTypeToggle = (b2b: boolean) => {
    setIsB2B(b2b);
    setCustomerNo('');
    setCustomerName('');
    setOrgInfo(null);
    setValidationError('');
  };

  const handleRegister = async () => {
    if (!order) return;

    // Validate before submitting
    if (!isB2B && customerNo.trim()) {
      const validation = validateConsumerNo(customerNo);
      if (!validation.valid) {
        setValidationError(validation.error || 'Буруу формат');
        return;
      }
    }

    if (isB2B && customerNo.trim()) {
      const validation = validateRegistrationNumber(customerNo);
      if (!validation.valid) {
        setValidationError(validation.error || 'Буруу формат');
        return;
      }
    }

    setStep('loading');
    setError('');

    try {
      let registerResult: EBarimtRegisterResult;

      if (!isOnline) {
        // Queue for offline processing
        await addToApiQueue(
          `/api/ebarimt/register/${order.id}`,
          'POST',
          {
            type: isB2B ? 'B2B' : 'B2C',
            customerNo: customerNo || undefined,
            customerName: customerName || undefined,
            save: true,
          }
        );
        registerResult = {
          success: true,
          message: 'Захиалга queue-д нэмэгдлээ. Онлайн болсны дараа автоматаар илгээгдэнэ.',
        };
      } else {
        registerResult = await ebarimtApi.register(order.id, {
          type: (isB2B ? 'B2B' : 'B2C') as EBarimtType,
          customerNo: customerNo || undefined,
          save: true,
        });
      }

      setResult(registerResult);

      if (registerResult.success) {
        setStep('success');
        onSuccess?.(registerResult);

        // Auto-print if enabled
        if (printTwoCopies && registerResult.pdfUrl) {
          try {
            await printReceipt(
              {
                orderId: order.id,
                customerName: customerName || 'Харилцагч',
                items: (order.items || []).map((item) => ({
                  name: item.product?.nameMongolian || item.product?.nameEnglish || 'Бараа',
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal: item.quantity * item.unitPrice,
                })),
                subtotal: subtotal,
                vatAmount: vatAmount,
                totalAmount: totalAmount,
                paymentMethod: order.paymentMethod || 'Бэлэн',
                eReceiptNumber: registerResult.lottery,
                qrBase64: registerResult.qrBase64,
              },
              { printTwoCopies: true, isB2B }
            );
          } catch (printError) {
            console.error('Auto-print failed:', printError);
            // Don't fail the registration if print fails
          }
        }
      } else {
        setError(registerResult.message || 'Алдаа гарлаа');
        setStep('error');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Алдаа гарлаа');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('select');
    setError('');
  };

  if (!order) return null;

  const totalAmount = order.totalAmount || 0;
  const vatAmount = order.vatAmount || Math.round(totalAmount * 0.1);
  const subtotal = totalAmount - vatAmount;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Э-Barimt</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={18} color={Colors.warning} />
            <Text style={styles.offlineText}>
              Интернэт холболт байхгүй байна. Захиалга queue-д хадгалагдаж, дараа илгээгдэнэ.
            </Text>
          </View>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Order Summary */}
          <Card style={styles.orderCard}>
            <Text style={styles.sectionTitle}>Захиалгын мэдээлэл</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Захиалгын дугаар:</Text>
              <Text style={styles.infoValue}>#{order.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Огноо:</Text>
              <Text style={styles.infoValue}>
                {new Date(order.createdAt || order.date).toLocaleDateString('mn-MN')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Дүн:</Text>
              <Text style={styles.infoValuePrimary}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>НӨАТ (10%):</Text>
              <Text style={styles.infoValue}>{formatCurrency(vatAmount)}</Text>
            </View>
          </Card>

          {/* Step: Select Type */}
          {step === 'select' && (
            <>
              <Card style={styles.optionsCard}>
                <Text style={styles.sectionTitle}>Барааны баримт хэлбэр</Text>

                <TouchableOpacity
                  style={[styles.optionButton, !isB2B && styles.optionButtonSelected]}
                  onPress={() => handleTypeToggle(false)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name={isB2B ? 'radio-button-off' : 'radio-button-on'}
                      size={22}
                      color={isB2B ? Colors.muted : Colors.primary}
                    />
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, !isB2B && styles.optionTitleSelected]}>
                        Б2С (Хүн)
                      </Text>
                      <Text style={styles.optionDesc}>
                        Иргэдийн регистрийн дугаар
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionButton, isB2B && styles.optionButtonSelected]}
                  onPress={() => handleTypeToggle(true)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name={isB2B ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={isB2B ? Colors.primary : Colors.muted}
                    />
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, isB2B && styles.optionTitleSelected]}>
                        Б2Б (Байгууллага)
                      </Text>
                      <Text style={styles.optionDesc}>
                        Байгууллагын регистрийн дугаар
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>

              <Card style={styles.inputCard}>
                <Text style={styles.sectionTitle}>
                  {isB2B ? 'Байгууллагын мэдээлэл' : 'Харилцагчийн мэдээлэл'}
                </Text>

                <Input
                  label={isB2B ? 'Байгууллагын ТТД/Регистр' : 'Иргэний регистр'}
                  value={customerNo}
                  onChangeText={handleCustomerNoChange}
                  placeholder={isB2B ? 'ТТД эсвэл Регистр' : 'АБ-12345678'}
                  keyboardType="default"
                  autoCapitalize="characters"
                  error={validationError}
                />

                {isLookingUp && (
                  <View style={styles.loadingIndicator}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingIndicatorText}>Хайж байна...</Text>
                  </View>
                )}

                {orgInfo && (
                  <View style={styles.orgInfoBox}>
                    <Text style={styles.orgInfoName}>{orgInfo.name}</Text>
                    <Text style={styles.orgInfoTin}>ТТД: {orgInfo.tin}</Text>
                  </View>
                )}

                {isB2B && (
                  <Input
                    label="Байгууллагын нэр"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Нэр автоматаар орж ирнэ"
                    style={styles.inputSpacer}
                  />
                )}

                <Text style={styles.helperText}>
                  {isB2B
                    ? 'Нэхэмжлэлд байгууллагын нэр харагдана'
                    : 'Регистрийн дугаар оруулснаар сугалааны дүн авах боломжтой'}
                </Text>

                {/* Print Two Copies Toggle */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>2 хувь хэвлэх</Text>
                    <Text style={styles.toggleDesc}>
                      Б2Б: QR-тэй/QR-гүй | Б2С: Сугалаатай/сугалаагүй
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, printTwoCopies && styles.toggleActive]}
                    onPress={() => setPrintTwoCopies(!printTwoCopies)}
                  >
                    <View style={[styles.toggleKnob, printTwoCopies && styles.toggleKnobActive]} />
                  </TouchableOpacity>
                </View>
              </Card>

              <View style={styles.actions}>
                <Button
                  title="Баримт хэвлэх"
                  onPress={handleRegister}
                  disabled={isB2B && !customerNo.trim()}
                  style={styles.fullWidthButton}
                />
              </View>
            </>
          )}

          {/* Step: Loading */}
          {step === 'loading' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                {isOnline ? 'Э-Barimt руу илгээж байна...' : 'Queue-д хадгалж байна...'}
              </Text>
              <Text style={styles.loadingSubtext}>
                Түр хүлээнэ үү
              </Text>
            </View>
          )}

          {/* Step: Success */}
          {step === 'success' && result && (
            <View style={styles.resultContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
              </View>
              <Text style={styles.resultTitle}>
                {!isOnline ? 'Queue-д нэмэгдлээ' : 'Амжилттай'}
              </Text>
              <Text style={styles.resultMessage}>
                {result.message || 'Баримт амжилттай бүртгэгдлээ'}
              </Text>

              {result.lottery && (
                <Card style={styles.lotteryCard}>
                  <Text style={styles.lotteryLabel}>Сугалааны дүн</Text>
                  <Text style={styles.lotteryNumber}>{result.lottery}</Text>
                </Card>
              )}

              {result.qrBase64 && (
                <Card style={styles.qrCard}>
                  <Text style={styles.qrLabel}>QR Код</Text>
                  <Image
                    source={{ uri: result.qrBase64 }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </Card>
              )}

              <View style={styles.actions}>
                <Button
                  title="Буцах"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.fullWidthButton}
                />
              </View>
            </View>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <View style={styles.resultContainer}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={80} color={Colors.destructive} />
              </View>
              <Text style={styles.resultTitle}>Алдаа гарлаа</Text>
              <Text style={styles.errorMessage}>{error}</Text>

              <View style={styles.actions}>
                <Button
                  title="Дахин оролдох"
                  onPress={handleRetry}
                  style={styles.halfWidthButton}
                />
                <Button
                  title="Болих"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.halfWidthButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  offlineText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  orderCard: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  infoValuePrimary: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  optionsCard: {
    marginBottom: Spacing.md,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: 2,
  },
  inputCard: {
    marginBottom: Spacing.md,
  },
  inputSpacer: {
    marginTop: Spacing.md,
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  loadingIndicatorText: {
    fontSize: FontSizes.sm,
    color: Colors.muted,
  },
  orgInfoBox: {
    backgroundColor: Colors.success + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  orgInfoName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  orgInfoTin: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  toggleDesc: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.card,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  fullWidthButton: {
    flex: 1,
  },
  halfWidthButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  loadingText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.lg,
  },
  loadingSubtext: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
    marginTop: Spacing.sm,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  errorIcon: {
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  resultMessage: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorMessage: {
    fontSize: FontSizes.md,
    color: Colors.destructive,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  lotteryCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    minWidth: 200,
  },
  lotteryLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginBottom: Spacing.xs,
  },
  lotteryNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
  },
  qrCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  qrLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginBottom: Spacing.md,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  qrPlaceholder: {
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
  },
});
