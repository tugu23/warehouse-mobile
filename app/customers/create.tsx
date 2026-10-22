import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { customersApi } from '@/api/customers';
import { Customer, CustomerType } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

const districts = [
  'Чингэлтэй', 'Баянзүрх', 'Баянгол', 'Сүхбаатар',
  'Хан-Уул', 'Налайх', 'Багануур', 'Багахангай',
];

export default function CreateCustomerScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    organizationName: '',
    registrationNumber: '',
    district: '',
    address: '',
    detailedAddress: '',
    customerType: '',
    isVatPayer: false,
  });

  // Fetch customer types from API
  const fetchCustomerTypes = useCallback(async () => {
    try {
      const types = await customersApi.getCustomerTypes();
      setCustomerTypes(types);
    } catch (error) {
      console.error('Error fetching customer types:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerTypes();
  }, [fetchCustomerTypes]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.phoneNumber) {
      Alert.alert('Алдаа', 'Дэлгүүрийн нэр болон утасны дугаар шаардлагатай');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerData: Partial<Customer> = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        district: form.district || undefined,
        address: form.address || undefined,
        organizationName: form.organizationName || undefined,
        registrationNumber: form.registrationNumber || undefined,
        isVatPayer: form.isVatPayer,
        customerTypeId: form.customerType ? parseInt(form.customerType, 10) : undefined,
      };

      await customersApi.createCustomer(customerData);
      Alert.alert('Амжилт', 'Харилцагч амжилттай үүслээ', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Харилцагч үүсгэх чадсангүй');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Харилцагч нэмэх</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!form.name || !form.phoneNumber || isSubmitting}
          style={[
            styles.saveButton,
            (!form.name || !form.phoneNumber) && styles.saveButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.saveButtonText,
              (!form.name || !form.phoneNumber) && styles.saveButtonTextDisabled,
            ]}
          >
            Хадгалах
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Basic Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Үндсэн мэдээлэл</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Нэр *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Дэлгүүрийн нэр"
              placeholderTextColor={Colors['muted-foreground']}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Утасны дугаар *</Text>
            <TextInput
              style={styles.input}
              value={form.phoneNumber}
              onChangeText={(value) => updateField('phoneNumber', value)}
              placeholder="99000000"
              placeholderTextColor={Colors['muted-foreground']}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Дүүрэг</Text>
            {/* Searchable dropdown for district */}
            <TouchableOpacity
              style={styles.typeSelector}
              onPress={() => {
                Alert.alert(
                  'Дүүрэг сонгох',
                  undefined,
                  [
                    ...districts.map((d) => ({
                      text: d,
                      onPress: () => updateField('district', d),
                    })),
                    { text: 'Болих', style: 'cancel' as const },
                  ],
                  { cancelable: true }
                );
              }}
            >
              <Text
                style={[
                  styles.typeSelectorText,
                  !form.district && styles.typeSelectorPlaceholder,
                ]}
              >
                {form.district || 'Дүүрэг сонгох...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Дэлгэрэнгүй хаяг</Text>
            <TextInput
              style={styles.input}
              value={form.address}
              onChangeText={(value) => updateField('address', value)}
              placeholder="Гудамж, байр, хороо"
              placeholderTextColor={Colors['muted-foreground']}
            />
          </View>
        </Card>

        {/* Organization Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Байгууллагын мэдээлэл</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Байгууллагын нэр</Text>
            <TextInput
              style={styles.input}
              value={form.organizationName}
              onChangeText={(value) => updateField('organizationName', value)}
              placeholder="ХХК, ХНН гэх мэт"
              placeholderTextColor={Colors['muted-foreground']}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>РД / ОН</Text>
            <TextInput
              style={styles.input}
              value={form.registrationNumber}
              onChangeText={(value) => updateField('registrationNumber', value)}
              placeholder="1234567"
              placeholderTextColor={Colors['muted-foreground']}
              keyboardType="number-pad"
            />
          </View>
        </Card>

        {/* Customer Type */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Харилцагчийн төрөл</Text>

          {isLoadingTypes ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Төрөл</Text>
              {/* Searchable dropdown for customer type */}
              <TouchableOpacity
                style={styles.typeSelector}
                onPress={() => {
                  // Simple modal-based selection for better UX
                  Alert.alert(
                    'Харилцагчийн төрөл сонгох',
                    undefined,
                    [
                      ...customerTypes.map((type) => ({
                        text: type.typeName || `Төрөл ${type.id}`,
                        onPress: () => updateField('customerType', String(type.id)),
                      })),
                      { text: 'Болих', style: 'cancel' as const },
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Text
                  style={[
                    styles.typeSelectorText,
                    !form.customerType && styles.typeSelectorPlaceholder,
                  ]}
                >
                  {form.customerType
                    ? customerTypes.find((t) => String(t.id) === form.customerType)?.typeName || 'Сонгогдсон'
                    : 'Төрөл сонгох...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.muted} />
              </TouchableOpacity>

              {/* Selected type indicator */}
              {form.customerType && (
                <View style={styles.selectedTypeContainer}>
                  <Badge
                    label={customerTypes.find((t) => String(t.id) === form.customerType)?.typeName || ''}
                    variant="primary"
                  />
                  <TouchableOpacity
                    onPress={() => updateField('customerType', '')}
                    style={styles.clearTypeButton}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.muted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.field}>
            <TouchableOpacity
              style={styles.vatToggle}
              onPress={() => updateField('isVatPayer', !form.isVatPayer)}
            >
              <View>
                <Text style={styles.label}>VAT төлөгч эсэх</Text>
                <Text style={styles.hint}>НӨАТ-ын төлөгч бол идэвхжүүлнэ үү</Text>
              </View>
              <Switch
                value={form.isVatPayer}
                onValueChange={(value) => updateField('isVatPayer', value)}
                trackColor={{ false: Colors.muted, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.bottomPadding} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.muted,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: Colors['muted-foreground'],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
  },
  input: {
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  districtButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
  },
  districtButtonSelected: {
    backgroundColor: Colors.primary,
  },
  districtButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
  },
  districtButtonTextSelected: {
    color: Colors.white,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeSelectorText: {
    fontSize: FontSizes.md,
    color: Colors.foreground,
    flex: 1,
  },
  typeSelectorPlaceholder: {
    color: Colors['muted-foreground'],
  },
  selectedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  clearTypeButton: {
    padding: Spacing.xs,
  },
  typeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  vatToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
