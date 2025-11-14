import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';

const ContactPage: React.FC = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.primaryText, marginTop: 20, marginBottom: 16 },
    content: { fontSize: 16, color: colors.secondaryText, lineHeight: 24, marginBottom: 20 },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      gap: 12,
    },
    contactText: { fontSize: 16, color: colors.primaryAccent, fontWeight: '600', flex: 1 },
  });

  return (
    <View style={styles.container}>
      <Header showBackButton />
      <ScrollView>
        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.content}>Get in touch with us:</Text>
        
        <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:ganeshangadi13012006@gmail.com')}>
          <Ionicons name="mail" size={24} color={colors.primaryAccent} />
          <Text style={styles.contactText}>ganeshangadi13012006@gmail.com</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('tel:+919986094984')}>
          <Ionicons name="call" size={24} color={colors.primaryAccent} />
          <Text style={styles.contactText}>+91 9986094984</Text>
        </TouchableOpacity>

        <Text style={[styles.content, { marginTop: 20 }]}>
          Address:{'\n'}
          Mysuru, Karnataka{'\n'}
          India
        </Text>
      </ScrollView>
    </View>
  );
};

export default ContactPage;
