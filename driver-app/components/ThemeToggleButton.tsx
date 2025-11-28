import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggleButton: React.FC = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const iconName = isDark ? 'sunny' : 'moon';

  return (
    <TouchableOpacity onPress={toggleTheme} style={styles.button}>
      <Ionicons 
        name={iconName} 
        size={24} 
        color={colors.primaryText} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
