import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Root bottom tab navigator param list.
 * TypeScript will produce a compile error for any navigate() call
 * using a name not present in this type.
 */
export type RootTabParamList = {
  TrendingNow: undefined;
  Categories: undefined;
  Profile: undefined;
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
export type TrendingNowTabProps = BottomTabScreenProps<RootTabParamList, 'TrendingNow'>;
export type CategoriesTabProps = BottomTabScreenProps<RootTabParamList, 'Categories'>;
export type ProfileTabProps = BottomTabScreenProps<RootTabParamList, 'Profile'>;

export type CategoryListScreenProps = NativeStackScreenProps<CategoryStackParamList, 'CategoryList'>;
export type CategoryFeedScreenProps = NativeStackScreenProps<CategoryStackParamList, 'CategoryFeed'>;
