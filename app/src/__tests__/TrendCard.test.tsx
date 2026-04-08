/**
 * Tests for TrendCard component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import TrendCard from '../components/TrendCard';
import type { Trend } from '../types';

// Mock dependencies that require native modules or external context
jest.mock('../context/BookmarkContext', () => ({
  useBookmarkContext: () => ({
    isBookmarked: () => false,
    toggleBookmark: jest.fn(),
  }),
}));

jest.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      primary: '#6200ee',
      primarySoft: '#ede7f6',
      text: '#000',
      textSecondary: '#555',
      muted: '#999',
      accent: '#03dac6',
      border: '#e0e0e0',
      background: '#f5f5f5',
      error: '#b00020',
      overlay: 'rgba(0,0,0,0.5)',
      surfaceStrong: '#e0e0e0',
      surfaceMuted: '#f0f0f0',
    },
    radii: { md: 8, sm: 4, pill: 100 },
    shadows: { card: {} },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      headingSmall: { fontSize: 16, fontWeight: '600' },
      bodySmall: { fontSize: 13 },
      labelSmall: { fontSize: 11 },
      labelLarge: { fontSize: 14, fontWeight: '600' },
      arabicBody: { fontSize: 14 },
    },
  }),
}));

jest.mock('../hooks/useIsRTL', () => ({
  useIsRTL: () => false,
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('react-native-iconify', () => ({
  Iconify: 'Iconify',
}));

const MOCK_TREND: Trend = {
  id: 'trend-1',
  title: 'Test Trend Title',
  title_ar: 'عنوان الاتجاه التجريبي',
  description: 'A test trend description',
  ar_translation: 'وصف الاتجاه التجريبي',
  url: 'https://example.com/trend-1',
  thumbnail_url: 'https://example.com/thumb.jpg',
  platform: 'youtube',
  category: 'Gaming',
  region_code: 'SA',
  metric_value: 150000,
  metric_type: 'views',
  status: 'approved',
  published_date: '2024-01-15',
};

describe('TrendCard', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<TrendCard trend={MOCK_TREND} />);
    // Arabic title should be displayed
    expect(getByText('عنوان الاتجاه التجريبي')).toBeTruthy();
  });

  it('renders Arabic title when title_ar is present', () => {
    const { getByText } = render(<TrendCard trend={MOCK_TREND} />);
    expect(getByText('عنوان الاتجاه التجريبي')).toBeTruthy();
  });

  it('falls back to English title when title_ar is absent', () => {
    const trend: Trend = { ...MOCK_TREND, title_ar: undefined };
    const { getByText } = render(<TrendCard trend={trend} />);
    expect(getByText('Test Trend Title')).toBeTruthy();
  });

  it('calls onPress with trend when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<TrendCard trend={MOCK_TREND} onPress={onPress} />);

    const button = getByRole('button', { name: /Trend:/ });
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledWith(MOCK_TREND);
  });

  it('has correct accessibilityLabel on main pressable', () => {
    const { getByRole } = render(<TrendCard trend={MOCK_TREND} />);
    const button = getByRole('button', { name: 'Trend: عنوان الاتجاه التجريبي' });
    expect(button).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(<TrendCard trend={MOCK_TREND} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
