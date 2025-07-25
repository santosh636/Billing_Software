// app/(tabs)/_layout.tsx

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  }, []);

  return (
    <ThemeProvider value={theme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // <-- hide the entire tab bar:
          tabBarStyle: { display: 'none' },
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          ...(Platform.OS === 'ios' ? { tabBarItemStyle: { position: 'absolute' } } : {}),
        }}
      >
        <Tabs.Screen
          name="menu-editor"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color }) => <IconSymbol name="list.bullet" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sales-overview"
          options={{
            title: 'Sales',
            tabBarIcon: ({ color }) => <IconSymbol name="chart.bar" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="predictive-analysis"
          options={{
            title: 'Predictive',
            tabBarIcon: ({ color }) => <IconSymbol name="lightbulb.fill" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <IconSymbol name="square.grid.2x2.fill" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin-dashboard-billing"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <IconSymbol name="briefcase.fill" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
