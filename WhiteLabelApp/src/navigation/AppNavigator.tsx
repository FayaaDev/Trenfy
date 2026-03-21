import React from 'react';
import { Pressable, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Iconify } from 'react-native-iconify';

import TrendingNowScreen from '../screens/TrendingNowScreen';
import { useTheme } from '../theme/ThemeContext';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const CIRCLE_SIZE = 56;

/** No bar — just a floating circle icon anchored above the safe area. */
function FloatingTabBar({ navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom - 23,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={() => navigation.navigate('TrendingNow')}
        accessibilityRole="button"
        accessibilityLabel="Trending Now"
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.floating,
        }}
      >
        <Iconify
          icon="streamline-plump:trending-content"
          size={28}
          color={colors.surface}
        />
      </Pressable>
    </View>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="TrendingNow" component={TrendingNowScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
