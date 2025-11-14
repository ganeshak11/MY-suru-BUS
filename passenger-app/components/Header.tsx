import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  showBackButton?: boolean;
  showReportButton?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showBackButton, showReportButton, onBackPress }) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 20,
    },
    button: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  });

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity onPress={onBackPress || (() => router.back())} style={styles.button}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
      )}
      {showReportButton && (
        <TouchableOpacity onPress={() => router.push('/report')} style={[styles.button, { marginLeft: 'auto' }]}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.primaryText} />
        </TouchableOpacity>
      )}
    </View>
  );
};
