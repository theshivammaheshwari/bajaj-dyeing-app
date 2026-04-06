import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from '../lib/api-base';

const EXPO_PUBLIC_BACKEND_URL = getBackendBaseUrl();

interface DyeItem {
  dye_name: string;
  quantity: number;
}

interface Shade {
  id: string;
  shade_number: string;
  original_weight: number;
  program_number: string;
  rc: string;
  dyes: DyeItem[];
}

export default function Index() {
  const router = useRouter();
  const [shades, setShades] = useState<Shade[]>([]);
  const [filteredShades, setFilteredShades] = useState<Shade[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShades();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredShades(shades);
    } else {
      const filtered = shades.filter((shade) =>
        shade.shade_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredShades(filtered);
    }
  }, [searchQuery, shades]);

  const fetchShades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades`);
      const data = await response.json();
      // Sort shades numerically by shade_number
      const sortedData = data.sort((a: Shade, b: Shade) => {
        const numA = parseInt(a.shade_number) || 0;
        const numB = parseInt(b.shade_number) || 0;
        return numA - numB;
      });
      setShades(sortedData);
      setFilteredShades(sortedData);
    } catch (error) {
      console.error('Error fetching shades:', error);
      Alert.alert('Error', 'Failed to load shades');
    } finally {
      setLoading(false);
    }
  };

  const deleteShade = async (id: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Shade deleted successfully!');
        } else {
          Alert.alert('Success', 'Shade deleted successfully');
        }
        fetchShades();
      } else {
        if (Platform.OS === 'web') {
          alert('Failed to delete shade');
        } else {
          Alert.alert('Error', 'Failed to delete shade');
        }
      }
    } catch (error) {
      console.error('Error deleting shade:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete shade');
      } else {
        Alert.alert('Error', 'Failed to delete shade');
      }
    }
  };

  const handleDeletePress = (id: string, shadeNumber: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Kya aap sure hain ki Shade #${shadeNumber} delete karna hai?`);
      if (confirmed) {
        deleteShade(id);
      }
    } else {
      Alert.alert(
        'Delete Shade',
        `Are you sure you want to delete Shade ${shadeNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteShade(id) },
        ]
      );
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      await AsyncStorage.removeItem('isAuthenticated');
      await AsyncStorage.removeItem('userRole');
      if (Platform.OS === 'web') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const renderShadeItem = ({ item }: { item: Shade }) => (
    <TouchableOpacity
      style={styles.shadeCard}
      onPress={() => router.push(`/calculator?shadeId=${item.id}`)}
    >
      <View style={styles.shadeHeader}>
        <Text style={styles.shadeNumber}>Shade #{item.shade_number}</Text>
        <View style={styles.badgeRow}>
          {item.rc === 'Yes' && (
            <View style={styles.rcBadge}>
              <Text style={styles.rcText}>RC</Text>
            </View>
          )}
          <View style={styles.programBadge}>
            <Text style={styles.programText}>{item.program_number || 'P1'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.shadeInfo}>
        <Text style={styles.shadeWeight}>{item.original_weight} kg</Text>
        <Text style={styles.dyesLabel}>{item.dyes.length} dyes</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/edit-shade?shadeId=${item.id}`)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item.id, item.shade_number)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bajaj Dyeing Unit</Text>
          <Text style={styles.headerSubtitle}>Thread Dyeing Machine Recipes</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by shade number..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/daily-tasks')}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionText}>Daily Tasks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => router.push('/dyeing-master')}
        >
          <Text style={styles.quickActionIcon}>👨‍🏭</Text>
          <Text style={styles.quickActionText}>Dyeing Master</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading shades...</Text>
        </View>
      ) : filteredShades.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No shades found' : 'No shades added yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {!searchQuery && 'Tap + button to add your first shade'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList
            data={filteredShades}
            renderItem={renderShadeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            style={styles.flatList}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-shade')}
      >
        <Text style={styles.addButtonText}>+ Add Shade</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#0f0f1e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  shadeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  shadeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shadeNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rcBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rcText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  programBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  programText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listWrapper: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  shadeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shadeWeight: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dyesLabel: {
    fontSize: 14,
    color: '#888',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
