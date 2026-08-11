import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { customersApi } from '@/api/customers';
import { Customer } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

const customerTypes = [
  'Зах', 'Дэлгүүр', 'Сүтгэл', 'Хорм плэза', 'Нарин', 'Монин', 'Оргил',
];

const districts = [
  'Чингэлтэй', 'Баянзүрх', 'Баянгол', 'Сүхбаатар',
  'Хан-Уул', 'Налайх', 'Багануур', 'Багахангай',
];

export default function CreateCustomerScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Basic Info */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Үндсэн мэдээлэл</Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Дэлгүүрийн нэр <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Дэлгүүрийн нэр оруулна уу"
                placeholderTextColor={Colors['muted-foreground']}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Утас <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.phoneNumber}
                onChangeText={(value) => updateField('phoneNumber', value)}
                placeholder="+976-XXXX-XXXX"
                placeholderTextColor={Colors['muted-foreground']}
                keyboardType="phone-pad"
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

            <View style={styles.field}>
              <Text style={styles.label}>Төрөл</Text>
              <View style={styles.typeGrid}>
                {customerTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      form.customerType === type && styles.typeButtonSelected,
                    ]}
                    onPress={() => updateField('customerType', type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        form.customerType === type && styles.typeButtonTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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

          {/* Location */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Хаяг</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Дүүрэг</Text>
              <View style={styles.typeGrid}>
                {districts.map((district) => (
                  <TouchableOpacity
                    key={district}
                    style={[
                      styles.typeButton,
                      form.district === district && styles.typeButtonSelected,
                    ]}
                    onPress={() => updateField('district', district)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        form.district === district && styles.typeButtonTextSelected,
                      ]}
                    >
                      {district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Хаяг</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="Хороо, гудамж, байр"
                placeholderTextColor={Colors['muted-foreground']}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Дэлгэрэнгүй хаяг</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.detailedAddress}
                onChangeText={(value) => updateField('detailedAddress', value)}
                placeholder="Орц, давхар, тэмдэглэгдэх зүйл"
                placeholderTextColor={Colors['muted-foreground']}
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>

          {/* Save Button */}
          <Button
            title="Харилцагч нэмэх"
            onPress={handleSave}
            disabled={!form.name || !form.phoneNumber || isSubmitting}
            isLoading={isSubmitting}
            style={styles.submitButton}
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
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButtonTextDisabled: {
    color: Colors['muted-foreground'],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
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
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: 2,
  },
  input: {
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.foreground,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
  },
  typeButtonTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  vatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
