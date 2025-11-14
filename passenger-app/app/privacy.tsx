import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

const PrivacyPage: React.FC = () => {
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
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.content}>
          We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use MY(suru) BUS.
          {'\n\n'}
          We collect location data only to provide real-time bus tracking services. Your data is never shared with third parties without your consent.
        </Text>
      </ScrollView>
    </View>
  );
};

export default PrivacyPage;
