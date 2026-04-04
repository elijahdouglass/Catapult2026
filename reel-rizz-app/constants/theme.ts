import { Platform } from 'react-native';

export const Colors = {
  // Brand colors
  rose300: '#fda4af',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',
  hotPink: '#ff2d78',
  coral: '#ff6b6b',

  light: {
    text: '#1a1a2e',
    textSecondary: '#555',
    textMuted: '#888',
    background: '#faf5f0',
    surface: 'rgba(255,255,255,0.85)',
    surfaceCard: 'rgba(255,255,255,0.9)',
    border: 'rgba(0,0,0,0.06)',
    borderAccent: 'rgba(232,67,111,0.2)',
    tint: '#f43f5e',
    icon: '#687076',
    tabIconDefault: '#999',
    tabIconSelected: '#f43f5e',
    reelBg: '#0a0a0f',
    shimmerA: '#1a1a2e',
    shimmerB: '#2a2a3e',
  },
  dark: {
    text: '#f0e6db',
    textSecondary: '#bbb',
    textMuted: '#777',
    background: '#0d0d12',
    surface: 'rgba(25,25,35,0.85)',
    surfaceCard: 'rgba(25,25,35,0.9)',
    border: 'rgba(255,255,255,0.06)',
    borderAccent: 'rgba(232,67,111,0.25)',
    tint: '#ff2d78',
    icon: '#9BA1A6',
    tabIconDefault: '#666',
    tabIconSelected: '#ff2d78',
    reelBg: '#0a0a0f',
    shimmerA: '#1a1a2e',
    shimmerB: '#2a2a3e',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
});
