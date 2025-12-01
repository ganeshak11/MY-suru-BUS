// components/StyledButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
// --- THIS LINE IS THE FIX ---
import { useTheme, themeTokens } from '../contexts/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
}

// 1. The main "StyledButton"
export const StyledButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.buttonBase, styles.primaryButton, style]}
      onPress={onPress}
      {...props}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
};

// 2. A "DangerButton" for stop/cancel actions
export const DangerButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.buttonBase, styles.dangerButton, style]}
      onPress={onPress}
      {...props}
    >
      <Text style={styles.dangerText}>{title}</Text>
    </TouchableOpacity>
  );
};

// --- THIS LINE IS THE FIX (added type) ---
const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    buttonBase: {
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      width: '100%',
    },
    
    primaryButton: {
      backgroundColor: colors.primaryAccent,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryText: {
      color: colors.buttonText,
      fontSize: 17,
      fontWeight: '700',
    },
    // Danger Button Style (for "Stop Trip")
    dangerButton: {
      backgroundColor: colors.dangerBackground || '#dc3545',
    },
    dangerText: {
      color: colors.dangerBackground,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });