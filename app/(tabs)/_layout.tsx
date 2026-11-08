import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Edge-to-edge үед Android-ийн доод navigation bar хэсэг дээр tab bar
  // суудаг тул зайг нэмэх шаардлагатай. Дээд талын зайг хасаж байгаа нь
  // дээрх screen-үүд SafeAreaView-ээр өөрсдөө хангалттай.
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        // Colors.muted (#ECECF0) нь цагаана дээр бөгөөд Android дээр
        // icon/label бүр харагдахгүй болдог. Ил тод өнгө хэрэглэнэ.
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Нүүр',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Захиалга',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Бараа',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Харилцагч',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kpi"
        options={{
          title: 'Тайлан',
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
