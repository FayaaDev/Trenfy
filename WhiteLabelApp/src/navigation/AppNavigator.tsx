import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Iconify } from 'react-native-iconify';

import TrendingNowScreen from '../screens/TrendingNowScreen';
import CategoryListScreen from '../screens/CategoryListScreen';
import CategoryFeedScreen from '../screens/CategoryFeedScreen';
import ProfileStubScreen from '../screens/ProfileStubScreen';
import { colors } from '../theme/tokens';
import type { RootTabParamList, CategoryStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const CategoryStack = createNativeStackNavigator<CategoryStackParamList>();

const navigationTheme = {
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

/**
 * Nested native stack for the Categories tab.
 * CategoryList is the root; tapping a category card navigates to CategoryFeed.
 * CategoryFeed uses the native header (no headerShown: false) to render
 * route.params.categoryName as the back-navigable screen title.
 */
function CategoriesStack() {
  return (
    <CategoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <CategoryStack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ headerShown: false }}
      />
      <CategoryStack.Screen
        name="CategoryFeed"
        component={CategoryFeedScreen}
        options={({ route }) => ({ title: route.params.categoryName })}
      />
    </CategoryStack.Navigator>
  );
}

/**
 * Root 3-tab navigator.
 * Tab labels: "Trending Now", "Categories", "Profile" (exact strings — per D-01).
 * Icons: Iconify (per D-02) — no @expo/vector-icons/Ionicons used here.
 * Tab bar: height 88, surface background, primary active tint (per D-12 to D-15).
 */
export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600' as const,
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 88,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: string;
            switch (route.name) {
              case 'TrendingNow':
                iconName = 'streamline-plump:trending-content';
                break;
              case 'Categories':
                iconName = 'si:grid-line';
                break;
              case 'Profile':
                iconName = 'iconamoon:profile-fill';
                break;
              default:
                iconName = 'si:grid-line';
            }
            return <Iconify icon={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="TrendingNow"
          component={TrendingNowScreen}
          options={{ tabBarLabel: 'Trending Now' }}
        />
        <Tab.Screen
          name="Categories"
          component={CategoriesStack}
          options={{ tabBarLabel: 'Categories' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStubScreen}
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
