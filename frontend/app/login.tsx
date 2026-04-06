import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const ADMIN_PASSWORD = '3112';
const USER_PASSWORD = '3020';

export default function Login() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    setLoading(true);

    let role = '';
    if (password === ADMIN_PASSWORD) {
      role = 'admin';
    } else if (password === USER_PASSWORD) {
      role = 'user';
    }

    if (role) {
      try {
        await AsyncStorage.setItem('isAuthenticated', 'true');
        await AsyncStorage.setItem('userRole', role);
        
        // Use a small delay to ensure AsyncStorage is updated
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = role === 'admin' ? '/' : '/dyeing-master';
          } else {
            router.replace(role === 'admin' ? '/' : '/dyeing-master');
          }
        }, 100);
      } catch (error) {
        console.error('Error saving auth state:', error);
        Alert.alert('Error', 'Failed to save login state');
        setLoading(false);
      }
    } else {
      Alert.alert('Error', 'Incorrect password. Please try again.');
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={[styles.appName, { color: colors.text }]}>🎨 Bajaj Dyeing Unit</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Thread Dyeing Recipe Calculator</Text>
          </View>

          <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Enter Password</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enter your password to access the app
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Verifying...' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.primary }]}>🔒 Secure Access</Text>
            <Text style={[styles.footerSubtext, { color: colors.textSecondary }]}>
              Your data is protected with password authentication
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  loginCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    letterSpacing: 4,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
