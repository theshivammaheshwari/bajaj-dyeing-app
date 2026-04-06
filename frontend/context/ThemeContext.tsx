import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  danger: string;
  success: string;
  inputBackground: string;
  divider: string;
  headerBackground: string;
  tabBarBackground: string;
  shadow: string;
  badgeBackground: string;
  badgeText: string;
}

const darkTheme: ThemeColors = {
  background: '#0f0f1e',
  card: '#1a1a2e',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  border: '#2a2a4a',
  primary: '#4CAF50',
  secondary: '#2196F3',
  danger: '#FF5252',
  success: '#4CAF50',
  inputBackground: '#252545',
  divider: '#2a2a4a',
  headerBackground: '#16162a',
  tabBarBackground: '#1a1a2e',
  shadow: '#000000',
  badgeBackground: '#33334d',
  badgeText: '#ffffff',
};

const lightTheme: ThemeColors = {
  background: '#f5f5f7',
  card: '#ffffff',
  text: '#1a1a2e',
  textSecondary: '#666666',
  border: '#e0e0e0',
  primary: '#2e7d32', // Slightly darker green for light mode contrast
  secondary: '#1565c0', // Slightly darker blue
  danger: '#d32f2f',
  success: '#2e7d32',
  inputBackground: '#f0f0f0',
  divider: '#e0e0e0',
  headerBackground: '#ffffff',
  tabBarBackground: '#ffffff',
  shadow: '#000000',
  badgeBackground: '#eeeeee',
  badgeText: '#333333',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>( darkTheme as any === 'dark' ? 'dark' : 'dark'); // Default to dark as per requirement

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme as ThemeType);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await AsyncStorage.setItem('userTheme', newTheme);
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
