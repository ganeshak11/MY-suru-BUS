// contexts/ThemeContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export const themeTokens = {
  light: {
    // Surfaces & Backgrounds
    mainBackground: '#F3F5FF',      // Indigo-tinted app background
    cardBackground: '#FFFFFF',      // Elevated cards
    tableBackground: '#FFFFFF',     // Tables and elevated surfaces
    tableHeaderBackground: '#F7F8FC', // Subtle header distinction
    tableRowHoverBackground: '#F3F5FF',

    // Primary Brand Colors
    primaryAccent: '#4B39FF',       // Deep sleek indigo
    primaryDark: '#392BCE',         // Primary pressed state
    primaryLight: '#7F73FF',        // Soft indigo tint for highlights
    
    // Functional Colors
    accentMint: '#34C759',          // Success / On-time / Completed
    warning: '#FF9F0A',             // Delays / Warnings
    error: '#FF453A',               // Stop trip / Critical alerts
    info: '#ADB5BD',                // Secondary icons / Info

    // Button Colors
    buttonText: '#FFFFFF',
    buttonPrimary: '#4B39FF',
    buttonPrimaryPressed: '#392BCE',

    // Text Colors
    primaryText: '#0A0A16',         // High emphasis
    secondaryText: '#4B4E5D',       // Medium emphasis
    hintText: '#8E90A6',            // Placeholders / Hints

    // Input & Interactive
    inputBackground: '#F7F8FC',
    border: '#E2E6F2',
    divider: '#E2E6F2',

    // Tab & Navigation
    activeTabBackground: '#4B39FF',
    inactiveTabBackground: '#F7F8FC',

    // Timeline & Map
    timelineCompleted: '#34C759',   // Completed stops
    timelineUpcoming: '#7F73FF',    // Upcoming stops
    timelineActive: '#4B39FF',      // Active bus/route
    dangerBackground: '#FFF5F5',
  },

  dark: {
    // Surfaces & Backgrounds
    mainBackground: '#0F0F17',      // Deep dark background
    cardBackground: '#1A1A25',      // Elevated cards
    tableBackground: '#1A1A25',     // Tables and elevated surfaces
    tableHeaderBackground: '#1F1F2A', // Subtle header distinction
    tableRowHoverBackground: '#1C1A33',

    // Primary Brand Colors
    primaryAccent: '#7F73FF',       // Soft indigo for dark mode
    primaryDark: '#4B39FF',         // Deeper variant
    primaryLight: '#9B91FF',        // Lighter tint for highlights
    
    // Functional Colors
    accentMint: '#34C759',          // Success / On-time / Completed
    warning: '#FF9F0A',             // Delays / Warnings
    error: '#FF453A',               // Stop trip / Critical alerts
    info: '#ADB5BD',                // Secondary icons / Info

    // Button Colors
    buttonText: '#FFFFFF',
    buttonPrimary: '#7F73FF',
    buttonPrimaryPressed: '#6B5FE6',

    // Text Colors
    primaryText: '#FFFFFF',         // High emphasis
    secondaryText: '#A9AEC4',       // Medium emphasis
    hintText: '#6E7186',            // Placeholders / Hints

    // Input & Interactive
    inputBackground: '#1F1F2A',
    border: '#2E3040',
    divider: '#2E3040',

    // Tab & Navigation
    activeTabBackground: '#4B39FF',
    inactiveTabBackground: '#1F1F2A',

    // Timeline & Map
    timelineCompleted: '#34C759',   // Completed stops
    timelineUpcoming: '#7F73FF',    // Upcoming stops
    timelineActive: '#7F73FF',      // Active bus/route
    dangerBackground: '#2A1A1A',
  },
};

type ThemeName = 'light' | 'dark';

type ThemeContextShape = {
  theme: ThemeName;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;
  colors: typeof themeTokens.light;
};

const ThemeContext = createContext<ThemeContextShape | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const initialTheme: ThemeName = systemColorScheme === 'dark' ? 'dark' : 'light';
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  const toggleTheme = () =>
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const isDark = theme === 'dark';

  const colors = useMemo(() => (isDark ? themeTokens.dark : themeTokens.light), [
    isDark,
  ]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
