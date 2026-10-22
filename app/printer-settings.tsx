import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from '@/types';
import {
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@/constants/theme';

const PRINTER_STORAGE_KEY = '@settings:printers';
const DEFAULT_PRINTER_KEY = '@settings:defaultPrinter';

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [defaultPrinterId, setDefaultPrinterId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  useEffect(() => {
    loadPrinters();
    loadDefaultPrinter();
    requestBluetoothPermission();
  }, []);

  const loadPrinters = async () => {
    try {
      const data = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (data) {
        setPrinters(JSON.parse(data));
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  };

  const loadDefaultPrinter = async () => {
    try {
      const id = await AsyncStorage.getItem(DEFAULT_PRINTER_KEY);
      setDefaultPrinterId(id);
    } catch (error) {
      console.error('Failed to load default printer:', error);
    }
  };

  const savePrinters = async (newPrinters: Printer[]) => {
    try {
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(newPrinters));
      setPrinters(newPrinters);
    } catch (error) {
      console.error('Failed to save printers:', error);
    }
  };

  const setAsDefault = async (printer: Printer) => {
    try {
      await AsyncStorage.setItem(DEFAULT_PRINTER_KEY, printer.id);
      setDefaultPrinterId(printer.id);
    } catch (error) {
      console.error('Failed to set default printer:', error);
    }
  };

  const removePrinter = (printer: Printer) => {
    Alert.alert(
      'Принтер устгах',
      `"${printer.name}" принтерийг устгах уу?`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Устгах',
          style: 'destructive',
          onPress: async () => {
            const newPrinters = printers.filter((p) => p.id !== printer.id);
            await savePrinters(newPrinters);
            if (defaultPrinterId === printer.id) {
              await AsyncStorage.removeItem(DEFAULT_PRINTER_KEY);
              setDefaultPrinterId(null);
            }
          },
        },
      ]
    );
  };

  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const hasPermission =
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
        setBluetoothEnabled(hasPermission);
      } catch (error) {
        console.error('Bluetooth permission error:', error);
      }
    } else {
      // iOS - Bluetooth is enabled by default when app is in use
      setBluetoothEnabled(true);
    }
  };

  const scanForPrinters = async () => {
    setIsScanning(true);
    // In a real implementation, this would use react-native-ble-plx
    // For now, we'll simulate finding printers
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert(
        'Скан хийх',
        'Энэ функцийг хэрэгжүүлэхийн тулд react-native-ble-plx суулгана уу.'
      );
    }, 1000);
  };

  const addDemoPrinter = async () => {
    const demoPrinter: Printer = {
      id: `printer-${Date.now()}`,
      name: 'XP-80C Series',
      address: '00:11:22:33:44:55',
      isConnected: true,
      isDefault: printers.length === 0,
    };
    await savePrinters([...printers, demoPrinter]);
  };

  const renderPrinterItem = ({ item }: { item: Printer }) => {
    const isDefault = item.id === defaultPrinterId;

    return (
      <TouchableOpacity
        onPress={() => setAsDefault(item)}
        onLongPress={() => removePrinter(item)}
      >
        <Card style={[styles.printerCard, isDefault && styles.printerCardDefault]}>
          <View style={styles.printerIcon}>
            <Ionicons
              name="print"
              size={28}
              color={isDefault ? Colors.primary : Colors.muted}
            />
          </View>
          <View style={styles.printerInfo}>
            <View style={styles.printerNameRow}>
              <Text style={styles.printerName}>{item.name}</Text>
              {isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Өгөгдмөл</Text>
                </View>
              )}
            </View>
            <Text style={styles.printerAddress}>{item.address}</Text>
            <View style={styles.printerStatus}>
              <View
                style={[
                  styles.statusDot,
                  item.isConnected ? styles.statusDotConnected : styles.statusDotDisconnected,
                ]}
              />
              <Text style={styles.statusText}>
                {item.isConnected ? 'Холбогдсон' : 'Холбогдоогүй'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => removePrinter(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.muted} />
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Принтер тохиргоо</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Bluetooth Status */}
      <Card style={styles.bluetoothCard}>
        <View style={styles.bluetoothRow}>
          <View style={styles.bluetoothInfo}>
            <Ionicons name="bluetooth" size={24} color={Colors.primary} />
            <Text style={styles.bluetoothLabel}>Bluetooth</Text>
          </View>
          <Switch
            value={bluetoothEnabled}
            onValueChange={(value) => {
              if (value) {
                requestBluetoothPermission();
              }
              setBluetoothEnabled(value);
            }}
            trackColor={{ false: Colors.muted, true: Colors.primary }}
          />
        </View>
      </Card>

      {/* Printer List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Хадгалсан принтерүүд</Text>
          <TouchableOpacity onPress={scanForPrinters} disabled={isScanning}>
            <Ionicons
              name="refresh"
              size={22}
              color={isScanning ? Colors.muted : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {printers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="print-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>Принтер олдсонгүй</Text>
            <Text style={styles.emptySubtext}>
              Шинэ принтер хайх эсвэл демо принтер нэмнэ үү
            </Text>
            <Button
              title="Демо принтер нэмэх"
              onPress={addDemoPrinter}
              variant="secondary"
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <FlatList
            data={printers}
            keyExtractor={(item) => item.id}
            renderItem={renderPrinterItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Шинэ принтер хайх"
          onPress={scanForPrinters}
          disabled={!bluetoothEnabled || isScanning}
          isLoading={isScanning}
          style={styles.fullWidthButton}
        />
      </View>

      {/* Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpText}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.muted} />
          {'  '}Холбогдсон принтер дээр удаан дарахад устгах боломжтой
        </Text>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
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
  bluetoothCard: {
    margin: Spacing.md,
    marginBottom: 0,
  },
  bluetoothRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bluetoothInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bluetoothLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  section: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  separator: {
    height: Spacing.sm,
  },
  printerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  printerCardDefault: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  printerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.muted + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  printerInfo: {
    flex: 1,
  },
  printerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  printerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.foreground,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.card,
  },
  printerAddress: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    marginTop: 2,
  },
  printerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusDotConnected: {
    backgroundColor: Colors.success,
  },
  statusDotDisconnected: {
    backgroundColor: Colors.muted,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  menuButton: {
    padding: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors['muted-foreground'],
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 180,
  },
  actions: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  fullWidthButton: {
    width: '100%',
  },
  helpSection: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    textAlign: 'center',
  },
});
