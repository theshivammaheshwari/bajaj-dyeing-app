import { useEffect, useState } from 'react';
import { useRouter, useSegments, Slot, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await AsyncStorage.getItem('isAuthenticated');
      console.log('Auth status:', auth);
      setIsAuthenticated(auth === 'true');
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated === null) return;

    const inLoginScreen = pathname === '/login';

    console.log('Auth:', isAuthenticated, 'Path:', pathname);

    if (!isAuthenticated && !inLoginScreen) {
      // Not authenticated, redirect to login
      console.log('Redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && inLoginScreen) {
      // Authenticated but on login screen, redirect to home
      console.log('Redirecting to home');
      router.replace('/');
    }
  }, [isAuthenticated, pathname]);

  if (isAuthenticated === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1e',
  },
});
