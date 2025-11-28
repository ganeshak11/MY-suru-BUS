// components/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
// --- THIS LINE IS THE FIX ---
import { useTheme, themeTokens } from '../contexts/ThemeContext';

// We can extend ViewProps to allow passing standard props like `style`
interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, style]} {...props}>
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
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  });