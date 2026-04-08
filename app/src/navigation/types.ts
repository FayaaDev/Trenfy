import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Trend } from '../types';

/**
 * Root stack navigator param list.
 * Wraps the tab navigator so modal-style screens (TrendDetail, Onboarding)
 * can be pushed on top of the tab UI.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  TrendDetail: { trend: Trend };
};

/**
 * Root bottom tab navigator param list.
 * TypeScript will produce a compile error for any navigate() call
 * using a name not present in this type.
 */
export type RootTabParamList = {
  TrendingNow: undefined;
  Bookmarks: undefined;
};

/**
 * Category nested native stack param list (inside the Categories tab).
 * CategoryFeed receives { categoryId, categoryName } — the minimum contract
 * needed for Phase 15 to fetch category-filtered trends.
 */
export type CategoryStackParamList = {
  CategoryList: undefined;
  CategoryFeed: { categoryId: string; categoryName: string };
};

// Convenience screen prop types — use these in screen components.
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type TrendDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TrendDetail'>;
export type MainTabsScreenProps = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export type TrendingNowTabProps = BottomTabScreenProps<RootTabParamList, 'TrendingNow'>;
export type BookmarksTabProps = BottomTabScreenProps<RootTabParamList, 'Bookmarks'>;

export type CategoryListScreenProps = NativeStackScreenProps<CategoryStackParamList, 'CategoryList'>;
export type CategoryFeedScreenProps = NativeStackScreenProps<CategoryStackParamList, 'CategoryFeed'>;
