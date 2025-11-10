import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '../contexts/ThemeContext';

const SplashScreen = () => {
  const { isDark, toggleTheme, colors: currentColors } = useTheme();

  const styles = StyleSheet.create({
    splashContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: currentColors.mainBackground,
      padding: 20,
    },
    splashTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: currentColors.primaryText,
    },
    splashSubtitle: {
      fontSize: 16,
      color: currentColors.secondaryText,
      textAlign: 'center',
      marginTop: 5,
    },
    themeToggle: {
      position: 'absolute',
      top: 40,
      right: 20,
    },
  });

  return (
    <View style={styles.splashContainer}>
      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
        <Icon name={isDark ? 'moon' : 'sunny'} type="ionicon" color={currentColors.primaryText} />
      </TouchableOpacity>
      <Text style={styles.splashTitle}>MY(suru) BUS</Text>
      <Text style={styles.splashSubtitle}>Stop waiting... Start tracking</Text>
    </View>
  );
};

export default SplashScreen;
