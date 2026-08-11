import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/card';
import { FilterChips } from '@/components/ui/filter-chips';
import { kpiApi } from '@/api/kpi';
import { KPISummary, KPITrendData } from '@/types';
import { formatCurrency, Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

const periodFilters = [
  { key: 'today', label: 'Өнөөдөр' },
  { key: 'week', label: '7 хоног' },
  { key: 'month', label: 'Энэ сар' },
];

export default function KPIScreen() {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [trendData, setTrendData] = useState<KPITrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    fetchKPIData();
  }, [selectedPeriod]);

  const fetchKPIData = async () => {
    try {
      const today = new Date();
      let from: Date;

      switch (selectedPeriod) {
        case 'today':
          from = today;
          break;
        case 'week':
          from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          from = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        default:
          from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Try API call, but use mock data on error
      try {
        const summary = await kpiApi.getKPISummary({
          from: from.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0],
        });
        setKpi(summary);
      } catch (apiError) {
        // Use mock data when API is unavailable
        setKpi({
          summary: {
            totalOrders: 150,
            totalAmount: 15000000,
            totalBoxes: 450,
            achievementPercentage: 75,
          },
          vsPreviousPeriod: {
            ordersChange: 10.5,
            amountChange: 8.2,
          },
          topProducts: [
            { productName: 'Сүү 1л', quantity: 500, amount: 1600000 },
            { productName: 'Тараг 500г', quantity: 380, amount: 1064000 },
            { productName: 'Цай Алтан Гоби', quantity: 290, amount: 435000 },
            { productName: 'Усны сав 5л', quantity: 210, amount: 525000 },
          ],
        });
        console.log('Using mock KPI data (API unavailable)');
      }

      // Generate mock trend data for the chart
      const days = selectedPeriod === 'month' ? 30 : selectedPeriod === 'week' ? 7 : 1;
      const mockTrend: KPITrendData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayNames = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
        mockTrend.push({
          day: dayNames[d.getDay()],
          amount: Math.random() * 15 + 5,
        });
      }
      setTrendData(mockTrend);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKPIData();
    setIsRefreshing(false);
  };

  // Achievement ring calculation
  const achievement = kpi?.summary?.achievementPercentage || 75;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (achievement / 100) * circumference;

  // Mock stats based on period
  const stats = {
    orders: kpi?.summary?.totalOrders || 150,
    amount: (kpi?.summary?.totalAmount || 15000000) / 1000000,
    boxes: kpi?.summary?.totalBoxes || 450,
  };

  // Find max for chart scaling
  const maxAmount = Math.max(...trendData.map((d) => d.amount), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ажилтны гүйцэтгэл</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <FilterChips
            options={periodFilters}
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
          />
        </View>

        {/* Achievement Ring */}
        <Card style={styles.achievementCard}>
          <Text style={styles.sectionTitle}>Зорилтын биелэлт</Text>
          <View style={styles.ringContainer}>
            <View style={styles.ring}>
              <View style={styles.ringBackground} />
              <View
                style={[
                  styles.ringProgress,
                  {
                    transform: [{ rotate: '-90deg' }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.ringProgressArc,
                    {
                      borderTopColor: Colors.primary,
                      borderRightColor: achievement >= 25 ? Colors.primary : 'transparent',
                      borderBottomColor: achievement >= 50 ? Colors.primary : 'transparent',
                      borderLeftColor: achievement >= 75 ? Colors.primary : 'transparent',
                    },
                  ]}
                />
              </View>
              <View style={styles.ringCenter}>
                <Text style={styles.achievementPercent}>{achievement}%</Text>
                <Text style={styles.achievementLabel}>биелэлт</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.orders}</Text>
              <Text style={styles.statLabel}>Захиалга</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedPeriod === 'month' ? `${stats.amount.toFixed(1)}м` : `${stats.amount.toFixed(1)}м`}
              </Text>
              <Text style={styles.statLabel}>Дүн (сая ₮)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.boxes}</Text>
              <Text style={styles.statLabel}>Хайрцаг</Text>
            </View>
          </View>
        </Card>

        {/* Comparison Cards */}
        <View style={styles.comparisonRow}>
          <Card style={styles.comparisonCard}>
            <View style={styles.comparisonContent}>
              <Text style={styles.comparisonValue}>+{kpi?.vsPreviousPeriod?.ordersChange || 10.5}%</Text>
              <Text style={styles.comparisonLabel}>Захиалга өөрчлөлт</Text>
            </View>
          </Card>
          <Card style={styles.comparisonCard}>
            <View style={styles.comparisonContent}>
              <Text style={styles.comparisonValue}>+{kpi?.vsPreviousPeriod?.amountChange || 8.2}%</Text>
              <Text style={styles.comparisonLabel}>Орлогын өөрчлөлт</Text>
            </View>
          </Card>
        </View>

        {/* Trend Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>7 хоногийн орлого (сая ₮)</Text>
          <View style={styles.chart}>
            {trendData.map((item, index) => {
              const height = (item.amount / maxAmount) * 120;
              const isToday = index === trendData.length - 1;
              return (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBarFill,
                        {
                          height: Math.max(height, 4),
                          backgroundColor: isToday ? Colors.muted : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Top Products */}
        <Card style={styles.topProductsCard}>
          <Text style={styles.sectionTitle}>Шилдэг бараанууд</Text>
          <View style={styles.topProductsList}>
            {(kpi?.topProducts || [
              { productName: 'Сүү 1л', quantity: 500, amount: 1600000 },
              { productName: 'Тараг 500г', quantity: 380, amount: 1064000 },
              { productName: 'Цай Алтан Гоби', quantity: 290, amount: 435000 },
              { productName: 'Усны сав 5л', quantity: 210, amount: 525000 },
            ]).map((product, index) => {
              const maxAmount = 1600000;
              const widthPercent = (product.amount / maxAmount) * 100;
              return (
                <View key={index} style={styles.topProductItem}>
                  <View style={styles.topProductHeader}>
                    <View style={styles.topProductRank}>
                      <Text style={styles.topProductRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.topProductName}>{product.productName}</Text>
                    <Text style={styles.topProductAmount}>
                      {formatCurrency(product.amount)}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[styles.progressBar, { width: `${widthPercent}%` }]}
                    />
                  </View>
                </View>
              );
            })}
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  periodSelector: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  achievementCard: {
    margin: Spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors['muted-foreground'],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  ringContainer: {
    marginVertical: Spacing.md,
  },
  ring: {
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringBackground: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: Colors.secondary,
  },
  ringProgress: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: 'transparent',
  },
  ringProgressArc: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 10,
  },
  ringCenter: {
    alignItems: 'center',
  },
  achievementPercent: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.foreground,
  },
  achievementLabel: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  comparisonCard: {
    flex: 1,
  },
  comparisonContent: {
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.success,
    fontVariant: ['tabular-nums'],
  },
  comparisonLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: Spacing.md,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    flex: 1,
    width: 24,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    marginTop: Spacing.xs,
  },
  topProductsCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  topProductsList: {
    gap: Spacing.md,
  },
  topProductItem: {
    gap: Spacing.xs,
  },
  topProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topProductRank: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topProductRankText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors['muted-foreground'],
  },
  topProductName: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.foreground,
  },
  topProductAmount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
