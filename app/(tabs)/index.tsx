import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/components/order-card';
import { useAuth } from '@/contexts/auth-context';
import { ordersApi } from '@/api/orders';
import { Order } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

export default function HomeScreen() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
  });
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsDataLoading(true);
    try {
      // Fetch today's orders - backend returns { data: { orders: [...] } }
      const today = new Date().toISOString().split('T')[0];
      const ordersResponse = await ordersApi.getOrders({ dateFrom: today, limit: 3 });
      const orders = ordersResponse?.data?.orders || [];
      setRecentOrders(orders.slice(0, 3));
      setStats((prev) => ({
        ...prev,
        todayOrders: orders.length,
      }));
    } catch (error: any) {
      // If 401, redirect to login
      if (error.response?.status === 401) {
        router.replace('/login');
      }
      console.error('Error fetching home data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={20} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>Агуулах</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.welcomeText}>Сайн байна уу,</Text>
          <Text style={styles.userName}>{user?.name || 'Ажилтан'} 👋</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Өнөөдрийн захиалга</Text>
              <Text style={styles.statValue}>{stats.todayOrders}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Button
          title="Захиалга нэмэх"
          onPress={() => router.push('/orders/create')}
          style={styles.quickActionButton}
          leftIcon={<Ionicons name="add" size={18} color={Colors.white} />}
        />

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Сүүлийн захиалгууд</Text>
            <TouchableOpacity onPress={() => router.push('/orders')}>
              <Text style={styles.seeAllText}>
                Бүгд <Ionicons name="chevron-forward" size={12} />
              </Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => router.push(`/orders/${order.id}`)}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="cart-outline" size={40} color={Colors.muted} />
              <Text style={styles.emptyText}>Захиалга алга</Text>
            </Card>
          )}
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  welcomeText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md - 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.white,
    fontVariant: ['tabular-nums'],
  },
  quickActionButton: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.foreground,
  },
  seeAllText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors['muted-foreground'],
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
