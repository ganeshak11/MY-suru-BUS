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
  const styles = createStyles(colors);

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
  const styles = createStyles(colors);

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
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
    },
    // Primary Button Style (for "Start Trip")
    primaryButton: {
      backgroundColor: colors.primaryAccent,
    },
    primaryText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    // Danger Button Style (for "Stop Trip")
    dangerButton: {
      backgroundColor: '#dc3545', // Standard red
      // Or you could add 'danger' to your theme
    },
    dangerText: {
      color: '#ffffff', // White text for danger
      fontSize: 16,
      fontWeight: 'bold',
    },
  });