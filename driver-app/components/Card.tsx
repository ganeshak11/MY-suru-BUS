// components/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
// --- THIS LINE IS THE FIX ---
import { useTheme, themeTokens } from '../contexts/ThemeContext';

// We can extend ViewProps to allow passing standard props like `style`
interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[createStyles(colors).card, style]}>
      {children}
    </View>
  );
};

// --- THIS LINE IS THE FIX (added type) ---
const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      // Professional touch: add a subtle shadow
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });