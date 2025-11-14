import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

const AboutPage: React.FC = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.primaryText, marginTop: 20, marginBottom: 16 },
    content: { fontSize: 16, color: colors.secondaryText, lineHeight: 24 },
  });

  return (
    <View style={styles.container}>
      <Header showBackButton />
      <ScrollView>
        <Text style={styles.title}>About Us</Text>
        <Text style={styles.content}>
          MY(suru) BUS is a real-time bus tracking application designed to make public transportation easier and more reliable for passengers in Mysuru.
          {'\n\n'}
          Our mission is to provide accurate, real-time information about bus locations and schedules, helping you plan your journey better and reduce waiting time at bus stops.
        </Text>
      </ScrollView>
    </View>
  );
};

export default AboutPage;
