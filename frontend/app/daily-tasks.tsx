import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { getBackendBaseUrl } from '../lib/api-base';
import { useTheme } from '../context/ThemeContext';

const EXPO_PUBLIC_BACKEND_URL = getBackendBaseUrl();

interface MachineTask {
  shade_id: string;
  shade_number: string;
  springs_2ply: number;
  springs_3ply: number;
  weight: number;
}

interface DailyTask {
  id: string;
  date: string;
  m1?: MachineTask[];
  m2?: MachineTask[];
  m3?: MachineTask[];
  m4?: MachineTask[];
  m5?: MachineTask[];
}

export default function DailyTasks() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to load daily tasks');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    console.log('Deleting task with ID:', id);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Task deleted successfully!');
        } else {
          Alert.alert('Success', 'Task deleted successfully');
        }
        fetchTasks();
      } else {
        const errorData = await response.json();
        console.log('Delete error:', errorData);
        if (Platform.OS === 'web') {
          alert(errorData.detail || 'Failed to delete task');
        } else {
          Alert.alert('Error', errorData.detail || 'Failed to delete task');
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete task');
      } else {
        Alert.alert('Error', 'Failed to delete task');
      }
    }
  };

  const handleDeletePress = (id: string, date: string) => {
    console.log('Delete pressed for ID:', id, 'Date:', date);
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Kya aap sure hain ki ${date} ka task delete karna hai?`);
      if (confirmed) {
        deleteTask(id);
      }
    } else {
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete task for ${date}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteTask(id) },
        ]
      );
    }
  };

  const handlePdfDownload = async (id: string, date: string) => {
    try {
      const pdfUrl = `${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${id}/pdf`;
      if (Platform.OS === 'web') {
        window.open(pdfUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(pdfUrl);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open PDF');
    }
  };

  const handleWhatsAppShare = async (id: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${id}/whatsapp-text`);
      const data = await response.json();
      
      if (data.text) {
        const encodedText = encodeURIComponent(data.text);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        
        if (Platform.OS === 'web') {
          window.open(whatsappUrl, '_blank');
        } else {
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert('Error', 'WhatsApp is not installed');
          }
        }
      }
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Alert.alert('Error', 'Failed to share to WhatsApp');
    }
  };

  const renderMachineInfo = (machines: MachineTask[] | undefined, machineName: string) => {
    if (!machines || machines.length === 0) {
      return (
        <View style={[styles.machineCard, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
          <Text style={[styles.machineName, { color: colors.primary }]}>{machineName}</Text>
          <Text style={[styles.noData, { color: colors.textSecondary }]}>No tasks</Text>
        </View>
      );
    }

    return (
      <View style={[styles.machineCard, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
        <Text style={[styles.machineName, { color: colors.primary }]}>{machineName} ({machines.length} tasks)</Text>
        {machines.map((task, index) => (
          <View key={index} style={[styles.taskItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.taskNumber, { color: colors.textSecondary }]}>Task {index + 1}</Text>
            <Text style={[styles.shadeText, { color: colors.text }]}>Shade #{task.shade_number}</Text>
            <View style={styles.springRow}>
              <View style={styles.springItem}>
                <Text style={[styles.springLabel, { color: colors.textSecondary }]}>2PLY</Text>
                <Text style={[styles.springValue, { color: colors.text }]}>{task.springs_2ply}</Text>
              </View>
              <View style={styles.springItem}>
                <Text style={[styles.springLabel, { color: colors.textSecondary }]}>3PLY</Text>
                <Text style={[styles.springValue, { color: colors.text }]}>{task.springs_3ply}</Text>
              </View>
              <View style={styles.springItem}>
                <Text style={[styles.springLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.springValueTotal, { color: colors.primary }]}>
                  {task.springs_2ply + task.springs_3ply}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTaskItem = ({ item }: { item: DailyTask }) => (
    <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.taskHeader}>
        <Text style={[styles.dateText, { color: colors.text }]}>📅 {item.date}</Text>
        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push(`/edit-daily-task?taskId=${item.id}`)}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.danger }]}
            onPress={() => handleDeletePress(item.id, item.date)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Buttons Row */}
      <View style={styles.shareRow}>
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => handlePdfDownload(item.id, item.date)}
        >
          <Text style={styles.shareBtnText}>📄 PDF Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => handleWhatsAppShare(item.id)}
        >
          <Text style={styles.shareBtnText}>📱 WhatsApp Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.machinesGrid}>
        {renderMachineInfo(item.m1, 'M1')}
        {renderMachineInfo(item.m2, 'M2')}
        {renderMachineInfo(item.m3, 'M3')}
        {renderMachineInfo(item.m4, 'M4')}
        {renderMachineInfo(item.m5, 'M5')}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Machine Tasks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Track daily production</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tasks...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No tasks created yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + button to add today's task</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push('/add-daily-task')}
      >
        <Text style={styles.addButtonText}>+ Add Daily Task</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  machinesGrid: {
    gap: 12,
  },
  machineCard: {
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  machineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  taskItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  taskNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  shadeText: {
    fontSize: 14,
    marginBottom: 8,
  },
  springRow: {
    flexDirection: 'row',
    gap: 12,
  },
  springItem: {
    flex: 1,
    alignItems: 'center',
  },
  springLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  springValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  springValueTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noData: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
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
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
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
