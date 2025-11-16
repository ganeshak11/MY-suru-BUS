import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

const TermsPage: React.FC = () => {
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
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.content}>
          By using MY(suru) BUS, you agree to these terms and conditions.
          {'\n\n'}
          The app provides real-time bus tracking information for informational purposes only. We strive for accuracy but cannot guarantee that all information is always up-to-date.
          {'\n\n'}
          Users must not misuse the app or attempt to interfere with its proper functioning.
        </Text>
      </ScrollView>
    </View>
  );
};

export default TermsPage;
