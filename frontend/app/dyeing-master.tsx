import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar, Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getBackendBaseUrl } from '../lib/api-base';
import { useTheme } from '../context/ThemeContext';

const EXPO_PUBLIC_BACKEND_URL = getBackendBaseUrl();
const MACHINES = [
  { id: 'm1', name: 'M1', capacity: 10.5, totalSprings: 7 },
  { id: 'm2', name: 'M2', capacity: 12, totalSprings: 8 },
  { id: 'm3', name: 'M3', capacity: 12, totalSprings: 8 },
  { id: 'm4', name: 'M4', capacity: 6, totalSprings: 4 },
  { id: 'm5', name: 'M5', capacity: 24, totalSprings: 16 },
];

// Helper function for showing alerts (web compatible)
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export default function DyeingMaster() {
  const router = useRouter();
  const { theme, colors, toggleTheme } = useTheme();
  const [dailyTask, setDailyTask] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightInputs, setWeightInputs] = useState<{[key: string]: {ply2: string, ply3: string}}>({});

  const handleLogout = async () => {
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
        { text: 'Logout', style: 'destructive', onPress: performLogout }
      ]
    );
  };

  useEffect(() => { 
    if (date === new Date().toISOString().split('T')[0]) {
      checkAndRollover();
    } else {
      fetchTodayTask();
    }
  }, [date]);

  const checkAndRollover = async () => {
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Check if yesterday has any tasks
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${yesterdayStr}`);
      const yesterdayData = await response.json();
      
      if (yesterdayData.id) {
        // Check if yesterday has pending tasks
        let hasPending = false;
        const machines = ['m1', 'm2', 'm3', 'm4', 'm5'];
        for (const m of machines) {
          const tasks = yesterdayData[m] || [];
          if (tasks.some((t: any) => t.status === 'pending' || !t.status)) {
            hasPending = true;
            break;
          }
        }
        
        if (hasPending) {
          // Automatically rollover
          const rolloverResponse = await fetch(
            `${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/rollover-pending?from_date=${yesterdayStr}&to_date=${date}`,
            { method: 'POST' }
          );
          const result = await rolloverResponse.json();
          console.log('Auto-rollover:', result);
        }
      }
      
      // Now fetch today's tasks
      fetchTodayTask();
    } catch (error) {
      console.error('Rollover check error:', error);
      fetchTodayTask();
    }
  };

  const fetchTodayTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${date}`);
      const data = await response.json();
      if (data.id) {
        setDailyTask(data);
        fetchPayment(data.id);
        initializeWeightInputs(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeWeightInputs = (task: any) => {
    const inputs: any = {};
    const machines = ['m1', 'm2', 'm3', 'm4', 'm5'];
    machines.forEach(machineId => {
      const tasks = task[machineId] || [];
      tasks.forEach((t: any, index: number) => {
        const key = `${machineId}-${index}`;
        inputs[key] = {
          ply2: t.ply2_weight && t.ply2_weight > 0 ? t.ply2_weight.toFixed(3) : '',
          ply3: t.ply3_weight && t.ply3_weight > 0 ? t.ply3_weight.toFixed(3) : ''
        };
      });
    });
    setWeightInputs(inputs);
  };

  const fetchPayment = async (taskId: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${taskId}/payment-calculation`);
      const data = await response.json();
      setPayment(data);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const updateLocalWeight = (machineId: string, taskIndex: number, field: 'ply2' | 'ply3', value: string) => {
    const key = `${machineId}-${taskIndex}`;
    setWeightInputs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const saveWeight = async (machineId: string, taskIndex: number, field: 'ply2' | 'ply3') => {
    const key = `${machineId}-${taskIndex}`;
    const value = weightInputs[key]?.[field] || '0';
    const numValue = parseFloat(value) || 0;
    const apiField = field === 'ply2' ? 'ply2_weight' : 'ply3_weight';
    await updateTaskField(machineId, taskIndex, apiField, numValue);
  };

  const updateTaskField = async (machineId: string, taskIndex: number, field: string, value: any) => {
    try {
      const params = new URLSearchParams({
        machine_id: machineId,
        task_index: taskIndex.toString(),
        [field]: value.toString(),
      });
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${dailyTask.id}/update-machine-task?${params}`, 
        { method: 'PUT' });
      fetchTodayTask();
    } catch (error) {
      console.error('Error updating:', error);
      showAlert('Error', 'Update failed');
    }
  };

  const startTask = (machineId: string, taskIndex: number) => {
    const time = new Date().toISOString();
    updateTaskField(machineId, taskIndex, 'start_time', time);
    updateTaskField(machineId, taskIndex, 'status', 'in-progress');
  };

  const completeTask = (machineId: string, taskIndex: number) => {
    const time = new Date().toISOString();
    updateTaskField(machineId, taskIndex, 'end_time', time);
    updateTaskField(machineId, taskIndex, 'status', 'completed');
  };

  const rejectTask = (machineId: string, taskIndex: number) => {
    showConfirm('Reject Lot', 'Are you sure this lot is damaged/rejected?', () => {
      const time = new Date().toISOString();
      updateTaskField(machineId, taskIndex, 'end_time', time);
      updateTaskField(machineId, taskIndex, 'status', 'rejected');
    });
  };

  const revokeTask = async (machineId: string, taskIndex: number, taskStatus: string) => {
    const message = taskStatus === 'completed' 
      ? 'Undo this completed task? It will go back to pending.'
      : 'Reset this task? All progress will be cleared.';
    
    showConfirm('Reset Task', message, async () => {
      try {
        console.log('Resetting task:', machineId, taskIndex, 'from status:', taskStatus);
        
        // Single API call with all parameters
        const resetParams = new URLSearchParams({
          machine_id: machineId,
          task_index: taskIndex.toString(),
          status: 'pending',
        });
        
        const response = await fetch(
          `${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${dailyTask.id}/update-machine-task?${resetParams}`,
          { method: 'PUT' }
        );
        
        if (!response.ok) {
          throw new Error('Failed to reset task');
        }
        
        console.log('Reset successful, refreshing data...');
        
        // Clear local weight inputs
        const key = `${machineId}-${taskIndex}`;
        setWeightInputs(prev => ({
          ...prev,
          [key]: { ply2: '', ply3: '' }
            }));
            
            // Reload data
            await fetchTodayTask();
            showAlert('Success', 'Task reset to pending');
          } catch (error) {
            console.error('Reset error:', error);
            showAlert('Error', 'Failed to reset task: ' + error);
          }
    });
  };

  const renderTaskBox = (machine: typeof MACHINES[0], task: any, index: number) => (
    <View key={index} style={[styles.taskBox, { backgroundColor: colors.background }]}>
      <Text style={[styles.taskTitle, { color: colors.secondary }]}>Task {index + 1}</Text>
      <Text style={[styles.shadeText, { color: colors.text }]}>Shade #{task.shade_number}</Text>
      <Text style={[styles.springText, { color: colors.textSecondary }]}>Springs: {task.springs_2ply} (2PLY) + {task.springs_3ply} (3PLY)</Text>
      <View style={styles.weightRow}>
        <View style={styles.weightInput}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>2PLY Weight (kg)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Enter weight (e.g., 10.500)" keyboardType="decimal-pad"
            value={weightInputs[`${machine.id}-${index}`]?.ply2 || ''}
            onChangeText={(val) => updateLocalWeight(machine.id, index, 'ply2', val)}
            onBlur={() => saveWeight(machine.id, index, 'ply2')} />
        </View>
        <View style={styles.weightInput}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>3PLY Weight (kg)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Enter weight (e.g., 5.250)" keyboardType="decimal-pad"
            value={weightInputs[`${machine.id}-${index}`]?.ply3 || ''}
            onChangeText={(val) => updateLocalWeight(machine.id, index, 'ply3', val)}
            onBlur={() => saveWeight(machine.id, index, 'ply3')} />
        </View>
      </View>
      <View style={styles.buttonRow}>
        {task.status !== 'in-progress' && task.status !== 'completed' && task.status !== 'rejected' && (
          <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={() => startTask(machine.id, index)}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}
        {task.status === 'in-progress' && (<>
          <TouchableOpacity style={[styles.completeButton, { backgroundColor: colors.secondary }]} onPress={() => completeTask(machine.id, index)}>
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rejectButton, { backgroundColor: colors.danger }]} onPress={() => rejectTask(machine.id, index)}>
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.revokeButton} onPress={() => revokeTask(machine.id, index, task.status)}>
            <Text style={styles.buttonText}>↺</Text>
          </TouchableOpacity>
        </>)}
        {task.status === 'completed' && (
          <View style={styles.completedRow}>
            <Text style={styles.completedText}>✓ Completed</Text>
            <TouchableOpacity style={styles.revokeButtonSmall} onPress={() => revokeTask(machine.id, index, task.status)}>
              <Text style={styles.buttonText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}
        {task.status === 'rejected' && (
          <View style={styles.completedRow}>
            <Text style={styles.rejectedText}>✕ Rejected</Text>
            <TouchableOpacity style={styles.revokeButtonSmall} onPress={() => revokeTask(machine.id, index, task.status)}>
              <Text style={styles.buttonText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {task.start_time && <Text style={styles.timeText}>Started: {new Date(task.start_time).toLocaleTimeString()}</Text>}
      {task.end_time && <Text style={styles.timeText}>Ended: {new Date(task.end_time).toLocaleTimeString()}</Text>}
    </View>
  );

  const renderMachineTasks = (machine: typeof MACHINES[0]) => {
    const tasks = dailyTask?.[machine.id] || [];
    if (tasks.length === 0) {
      return (
        <View style={styles.machineCard}>
          <Text style={styles.machineName}>{machine.name}</Text>
          <Text style={styles.noTasks}>No tasks</Text>
        </View>
      );
    }
    const pendingTasks = tasks.filter((t: any) => t.status === 'pending' || !t.status);
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress');
    const completedTasks = tasks.filter((t: any) => t.status === 'completed');
    const rejectedTasks = tasks.filter((t: any) => t.status === 'rejected');

    return (
      <View style={styles.machineCard}>
        <Text style={styles.machineName}>{machine.name}</Text>
        {pendingTasks.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>⏳ Pending ({pendingTasks.length})</Text>
            {tasks.map((task: any, index: number) => {
              if (task.status !== 'pending' && task.status) return null;
              return renderTaskBox(machine, task, index);
            })}
          </View>
        )}
        {inProgressTasks.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={[styles.statusTitle, styles.inProgressTitle]}>🔄 In Progress ({inProgressTasks.length})</Text>
            {tasks.map((task: any, index: number) => {
              if (task.status !== 'in-progress') return null;
              return renderTaskBox(machine, task, index);
            })}
          </View>
        )}
        {completedTasks.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={[styles.statusTitle, styles.completedTitle]}>✓ Completed ({completedTasks.length})</Text>
            {tasks.map((task: any, index: number) => {
              if (task.status !== 'completed') return null;
              return renderTaskBox(machine, task, index);
            })}
          </View>
        )}
        {rejectedTasks.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={[styles.statusTitle, styles.rejectedTitle]}>✕ Rejected ({rejectedTasks.length})</Text>
            {tasks.map((task: any, index: number) => {
              if (task.status !== 'rejected') return null;
              return renderTaskBox(machine, task, index);
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1e" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dyeing Master</Text>
          <Text style={styles.headerSubtitle}>Worker Panel</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dateBar}>
        <TextInput
          style={styles.dateInput}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#666"
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {!dailyTask && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks found for {date}</Text>
          </View>
        )}
        {dailyTask && MACHINES.map((machine) => renderMachineTasks(machine))}
        {payment && (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>💰 Payment Calculation</Text>
            
            {/* Completed Tasks */}
            {payment.completed_tasks > 0 && (
              <View style={styles.paymentSection}>
                <Text style={styles.sectionLabel}>✓ Completed Tasks</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Weight:</Text>
                  <Text style={styles.paymentValue}>{payment.completed_kg} kg</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Rate:</Text>
                  <Text style={styles.paymentValue}>₹{payment.rate_per_kg}/kg</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment:</Text>
                  <Text style={styles.paymentValue}>₹{payment.completed_payment}</Text>
                </View>
              </View>
            )}
            
            {/* Rejected Tasks - Black Colour */}
            {payment.rejected_tasks > 0 && (
              <View style={[styles.paymentSection, styles.rejectedSection]}>
                <Text style={styles.sectionLabelRejected}>✕ Rejected (Black Colour)</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Weight:</Text>
                  <Text style={styles.paymentValue}>{payment.rejected_kg} kg</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Rate (Half):</Text>
                  <Text style={styles.paymentValue}>₹{payment.half_rate}/kg</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Payment:</Text>
                  <Text style={styles.paymentValue}>₹{payment.rejected_payment}</Text>
                </View>
              </View>
            )}
            
            {/* Total */}
            <View style={[styles.paymentRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Payment:</Text>
              <Text style={styles.totalPayment}>₹{payment.total_payment}</Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statText}>Total: {payment.total_kg} kg</Text>
              <Text style={styles.statText}>Tasks: {payment.completed_tasks + payment.rejected_tasks}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  dateBar: { paddingHorizontal: 16, paddingVertical: 8 },
  dateInput: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 6,
    borderWidth: 1,
  },
  scroll: { padding: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600' },
  machineCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4 },
  machineName: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  noTasks: { fontSize: 14 },
  statusSection: { marginBottom: 16 },
  statusTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1 },
  inProgressTitle: { },
  completedTitle: { },
  rejectedTitle: { },
  taskBox: { borderRadius: 8, padding: 12, marginBottom: 12 },
  taskTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  shadeText: { fontSize: 14, marginBottom: 4 },
  springText: { fontSize: 12, marginBottom: 12 },
  weightRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  weightInput: { flex: 1 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  startButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  completeButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  rejectButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  revokeButton: { width: 44, padding: 12, borderRadius: 8, alignItems: 'center' },
  revokeButtonSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  completedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  completedText: { fontWeight: '600', fontSize: 14 },
  rejectedText: { fontWeight: '600', fontSize: 14 },
  timeText: { fontSize: 11, marginTop: 4 },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 100 },
  paymentCard: { borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 2 },
  paymentTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  paymentSection: { borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  sectionLabelRejected: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontSize: 14 },
  paymentValue: { fontSize: 14, fontWeight: '600' },
  totalRow: { borderTopWidth: 2, paddingTop: 16, marginTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalPayment: { fontSize: 22, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  statText: { fontSize: 13 },
  rejectedStat: { fontSize: 14 },
});
