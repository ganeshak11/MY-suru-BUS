import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export const themeTokens = {
  light: {
    mainBackground: '#f1f1f1',
    cardBackground: '#ffffffff',
    tableBackground: '#ffffff',
    tableHeaderBackground: '#f1f1f1',
    tableRowHoverBackground: '#f9f9f9',
    primaryAccent: '#C8B6E2',
    buttonText: '#333333',
    primaryText: '#2b2020',
    secondaryText: '#888888',
    activeTabBackground: '#C8B6E2',
    inactiveTabBackground: '#F5F7FA',
  },
  dark: {
    mainBackground: '#1e1e2fff',
    cardBackground: '#2a2a40',
    tableBackground: '#2a2a40',
    tableHeaderBackground: '#1e1e2f',
    tableRowHoverBackground: '#3c3c55',
    primaryAccent: '#8a63d2ff',
    buttonText: '#ffffff',
    primaryText: '#ffffffff',
    secondaryText: '#b0b0c0ff',
    activeTabBackground: '#895fd8ff',
    inactiveTabBackground: '#7d7dd4ff',
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const initial: ThemeName = system === 'dark' ? 'dark' : 'light';
  const [theme, setTheme] = useState<ThemeName>(initial);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const isDark = theme === 'dark';

  const colors = useMemo(() => (isDark ? themeTokens.dark : themeTokens.light), [isDark]);

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

export default ThemeContext;
