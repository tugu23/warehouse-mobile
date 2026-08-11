import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Customer } from '@/types';
import { Colors, FontSizes, Spacing, CustomerTypeLabels } from '@/constants/theme';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const handleCall = () => {
    if (customer.phoneNumber) {
      Linking.openURL(`tel:${customer.phoneNumber}`);
    } else {
      Alert.alert('Алдаа', 'Утасны дугаар байхгүй байна');
    }
  };

  const handleNavigate = () => {
    if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address);
      Linking.openURL(`https://maps.apple.com/?daddr=${encodedAddress}`);
    } else {
      Alert.alert('Алдаа', 'Хаяг байхгүй байна');
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{customer.name}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={Colors['muted-foreground']} />
              <Text style={styles.address} numberOfLines={1}>
                {customer.address || customer.district || 'Хаяг байхгүй'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.badges}>
            <Badge
              label={CustomerTypeLabels[customer.customerType?.typeName || 'Retail'] || 'Жижиглэн'}
              variant={customer.customerType?.typeName === 'Wholesale' ? 'info' : 'success'}
            />
            {customer.isVatPayer && (
              <Badge label="VAT" variant="primary" />
            )}
            <Badge label={`${customer.orderCount || 0} захиалга`} variant="default" />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={16} color={Colors.success} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
              <Ionicons name="navigate" size={16} color={Colors.info} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  address: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
