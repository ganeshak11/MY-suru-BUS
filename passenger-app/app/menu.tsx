import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

const MenuPage: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const menuItems = [
    { title: 'About Us', icon: 'information-circle', route: '/about' },
    { title: 'Privacy Policy', icon: 'shield-checkmark', route: '/privacy' },
    { title: 'Terms & Conditions', icon: 'document-text', route: '/terms' },
    { title: 'Help & Support', icon: 'help-circle', route: '/support' },
    { title: 'Contact Us', icon: 'mail', route: '/contact' },
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.primaryText, marginTop: 20, marginBottom: 20 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    menuIcon: { marginRight: 16 },
    menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.primaryText },
    chevron: { opacity: 0.5 },
  });

  return (
    <View style={styles.container}>
      <Header showBackButton />
      <Text style={styles.title}>Menu</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={() => router.push(item.route)}>
            <Ionicons name={item.icon as any} size={24} color={colors.primaryAccent} style={styles.menuIcon} />
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default MenuPage;
