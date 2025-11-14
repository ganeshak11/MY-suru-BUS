import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

const SupportPage: React.FC = () => {
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
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.content}>
          Need help? We're here to assist you!
          {'\n\n'}
          For technical issues or questions about using the app, please submit a report through the app or contact our support team.
          {'\n\n'}
          Common issues:{'\n'}
          • Bus location not updating - Check your internet connection{'\n'}
          • Can't find a route - Try searching with different stop names{'\n'}
          • App crashes - Please restart the app and report the issue
        </Text>
      </ScrollView>
    </View>
  );
};

export default SupportPage;
