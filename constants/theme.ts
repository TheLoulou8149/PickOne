export const Colors = {
  // Fonds
  background: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceElevated: '#E7E7E7',
  border: '#E7E7E7',

  // Primaire — Orange
  primary: '#FF634A',
  primaryLight: '#FFA494',
  primaryDark: '#E64C33',

  // Accent
  accent: '#FF634A',
  accentLight: '#FFA494',

  // Regret Mode
  danger: '#EF4444',
  dangerLight: '#FCA5A5',

  // Succès
  success: '#10B981',
  successLight: '#6EE7B7',

  // Warning
  warning: '#F59E0B',
  warningLight: '#FCD34D',

  // Textes
  textPrimary: '#272727', // Gris sombre (corrigé de #E7E7E7 pour rester lisible)
  textSecondary: '#7E7E7E',
  textMuted: '#A1A1A1',

  // Scores
  scoreHigh: '#10B981',
  scoreMid: '#F59E0B',
  scoreLow: '#EF4444',
};

export const Typography = {
  fontSizeXS: 11,
  fontSizeSM: 13,
  fontSizeMD: 15,
  fontSizeLG: 18,
  fontSizeXL: 22,
  fontSize2XL: 28,
  fontSize3XL: 36,

  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
  fontWeightBlack: '900' as const,

  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowAccent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
};
