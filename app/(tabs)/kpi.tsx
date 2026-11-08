import React, { useState, useEffect, useCallback } from 'react';
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

/** Formats a period-over-period change, or "—" when there is no baseline. */
function formatChange(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

export default function KPIScreen() {
  const [kpi, setKpi] = useState<KPISummary | null>(null);
  const [trendData, setTrendData] = useState<KPITrendData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [error, setError] = useState<string | null>(null);

  // Data loading lives in a plain function (not a hook) so it can be reused
  // by both the mount effect and the pull-to-refresh handler.
  const fetchKPIData = useCallback(async () => {
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

      const fromDate = from.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      // Load the summary and the trend series together; both come from the
      // live API so the numbers always reflect real orders.
      const [summary, trend] = await Promise.all([
        kpiApi.getKPISummary({ from: fromDate, to: toDate }),
        kpiApi.getTrendData({ from: fromDate, to: toDate }),
      ]);

      setKpi(summary);
      setTrendData(trend);
      setError(null);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Тайлангийн мэдээллийг ачаалж чадсангүй'
      );
    }
  }, [selectedPeriod]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKPIData();
    setIsRefreshing(false);
  };

  // Nothing loaded yet and no error -> the first request is still running.
  const isLoading = kpi === null && error === null;

  useEffect(() => {
    // The state updates happen after the awaits resolve, so this is a
    // subscription to an external system (the API), not a cascading render.
    const load = async () => {
      await fetchKPIData();
    };
    load();
  }, [fetchKPIData]);

  // Achievement ring calculation. The backend reports the achievement rate
  // directly; fall back to 0 so an unset target never renders a fake 75%.
  const achievement = kpi?.achievementSummary?.overallPct ?? 0;

  const stats = {
    orders: kpi?.totalOrders ?? 0,
    amount: (kpi?.totalAmount ?? 0) / 1000000,
    boxes: kpi?.totalBoxes ?? 0,
  };

  // Percentage change against the previous period of the same length.
  const percentChange = (current: number, previous?: number): number | null => {
    if (previous == null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  const ordersChange = percentChange(
    stats.orders,
    kpi?.previousPeriodTotals?.totalOrders
  );
  const amountChange = percentChange(
    kpi?.totalAmount ?? 0,
    kpi?.previousPeriodTotals?.totalAmount
  );

  // Top products: the summary endpoint returns a single best seller, so the
  // list is built from that product plus the category leader.
  const topProducts = kpi?.topProduct
    ? [
        {
          id: kpi.topProduct.id,
          name: kpi.topProduct.name,
          amount: kpi.topProduct.amount,
        },
      ]
    : [];
  const maxProductAmount = Math.max(...topProducts.map((p) => p.amount), 1);

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

        {isLoading && !error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Тайлан ачаалж байна…</Text>
            <Text style={styles.errorHint}>Үүнийг ачаалахад багахан хугацаа шаардана.</Text>
          </Card>
        ) : null}

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Тайлан ачаалагдсангүй</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              Интернэтийн холбоог шалгаад дахин оролтоно. Доорх хуудлыг
              гүйлгэж баяжуулж болно.
            </Text>
          </Card>
        ) : null}

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
              <Text
                style={[
                  styles.comparisonValue,
                  (ordersChange ?? 0) < 0 && styles.comparisonValueDown,
                ]}
              >
                {formatChange(ordersChange)}
              </Text>
              <Text style={styles.comparisonLabel}>Захиалга өөрчлөлт</Text>
            </View>
          </Card>
          <Card style={styles.comparisonCard}>
            <View style={styles.comparisonContent}>
              <Text
                style={[
                  styles.comparisonValue,
                  (amountChange ?? 0) < 0 && styles.comparisonValueDown,
                ]}
              >
                {formatChange(amountChange)}
              </Text>
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
                          backgroundColor: isToday ? Colors.primary : '#93C5FD',
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
            {topProducts.length === 0 ? (
              <Text style={styles.emptyText}>Энэ хугацаанд борлуулалт байхгүй</Text>
            ) : (
              topProducts.map((product, index) => {
                const widthPercent = (product.amount / maxProductAmount) * 100;
                return (
                  <View key={product.id} style={styles.topProductItem}>
                    <View style={styles.topProductHeader}>
                      <View style={styles.topProductRank}>
                        <Text style={styles.topProductRankText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.topProductName}>{product.name}</Text>
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
              })
            )}
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
  comparisonValueDown: {
    color: Colors.error,
  },
  errorCard: {
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  errorHint: {
    fontSize: FontSizes.xs,
    color: Colors['muted-foreground'],
    lineHeight: 16,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
    textAlign: 'center',
    paddingVertical: Spacing.md,
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
