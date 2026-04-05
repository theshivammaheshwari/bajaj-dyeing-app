import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getBackendBaseUrl } from '../lib/api-base';

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
  const [dailyTask, setDailyTask] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [weightInputs, setWeightInputs] = useState<{[key: string]: {ply2: string, ply3: string}}>({});
  const [activeTask, setActiveTask] = useState<{ machineId: string; taskIndex: number } | null>(null);

  useEffect(() => { 
    checkAndRollover();
  }, []);

  const getMachineTasks = (machineId: string) => dailyTask?.[machineId] || [];
  const maxRows = Math.max(...MACHINES.map(m => getMachineTasks(m.id).length), 0);

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

  const renderMachineTasks = (machine: typeof MACHINES[0]) => {
    return null; // Logic handled by grid
  };

  const renderTaskEditModal = () => {
    if (!activeTask) return null;

    const { machineId, taskIndex } = activeTask;
    const tasks = getMachineTasks(machineId);
    const task = tasks[taskIndex];
    if (!task) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={() => setActiveTask(null)}
          >
            <Text style={styles.closeModalButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Update {MACHINES.find(m => m.id === machineId)?.name} Task</Text>
          
          <Text style={styles.shadeText}>Shade #{task.shade_number}</Text>
          <Text style={styles.springText}>Springs: {task.springs_2ply} (2PLY) + {task.springs_3ply} (3PLY)</Text>

          <View style={styles.weightRow}>
            <View style={styles.weightInput}>
              <Text style={styles.label}>2PLY Weight (kg)</Text>
              <TextInput style={styles.input} placeholder="0.000" keyboardType="decimal-pad"
                value={weightInputs[`${machineId}-${taskIndex}`]?.ply2 || ''}
                onChangeText={(val) => updateLocalWeight(machineId, taskIndex, 'ply2', val)}
                onBlur={() => saveWeight(machineId, taskIndex, 'ply2')} />
            </View>
            <View style={styles.weightInput}>
              <Text style={styles.label}>3PLY Weight (kg)</Text>
              <TextInput style={styles.input} placeholder="0.000" keyboardType="decimal-pad"
                value={weightInputs[`${machineId}-${taskIndex}`]?.ply3 || ''}
                onChangeText={(val) => updateLocalWeight(machineId, taskIndex, 'ply3', val)}
                onBlur={() => saveWeight(machineId, taskIndex, 'ply3')} />
            </View>
          </View>

          <View style={styles.buttonRow}>
            {task.status !== 'in-progress' && task.status !== 'completed' && task.status !== 'rejected' && (
              <TouchableOpacity style={styles.startButton} onPress={() => startTask(machineId, taskIndex)}>
                <Text style={styles.buttonText}>Start</Text>
              </TouchableOpacity>
            )}
            {task.status === 'in-progress' && (<>
              <TouchableOpacity style={styles.completeButton} onPress={() => completeTask(machineId, taskIndex)}>
                <Text style={styles.buttonText}>Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={() => rejectTask(machineId, taskIndex)}>
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </>)}
            {(task.status === 'completed' || task.status === 'rejected' || task.status === 'in-progress') && (
              <TouchableOpacity style={styles.revokeButton} onPress={() => revokeTask(machineId, taskIndex, task.status)}>
                <Text style={styles.buttonText}>Reset Task</Text>
              </TouchableOpacity>
            )}
          </View>

          {task.start_time && <Text style={styles.timeText}>Started: {new Date(task.start_time).toLocaleTimeString()}</Text>}
          {task.end_time && <Text style={styles.timeText}>Ended: {new Date(task.end_time).toLocaleTimeString()}</Text>}
          
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => setActiveTask(null)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dyeing Master</Text>
        <View style={styles.dateInputContainer}>
          <Text style={styles.dateText}>📅 {date}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      >
        <View>
          {/* Top Row: Machine Cards */}
          <View style={styles.gridRow}>
            <View style={styles.rowNumberCell}>
              <Text style={styles.rowNumberText}>#</Text>
            </View>
            {MACHINES.map(machine => {
              const tasks = getMachineTasks(machine.id);
              const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
              return (
                <View key={machine.id} style={styles.machineInfoCard}>
                  <Text style={styles.machineNameText}>{machine.name}</Text>
                  <Text style={styles.machineWeightText}>{machine.capacity}kg</Text>
                  <Text style={styles.machineCountText}>{completedCount}/{tasks.length}</Text>
                </View>
              );
            })}
          </View>

          {/* Task Grid Rows */}
          {Array.from({ length: maxRows }).map((_, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              <View style={styles.rowNumberCell}>
                <Text style={styles.rowNumberText}>{rowIndex + 1}</Text>
              </View>
              {MACHINES.map(machine => {
                const tasks = getMachineTasks(machine.id);
                const task = tasks[rowIndex];
                
                let cellBg = '#1a1a2e';
                let statusIcon = '';
                if (task) {
                  if (task.status === 'completed') cellBg = '#1b5e20';
                  else if (task.status === 'rejected') cellBg = '#b71c1c';
                  else if (task.status === 'in-progress') cellBg = '#0d47a1';
                }

                return (
                  <TouchableOpacity 
                    key={machine.id} 
                    style={[styles.gridCell, { backgroundColor: cellBg }]}
                    onPress={() => task && setActiveTask({ machineId: machine.id, taskIndex: rowIndex })}
                  >
                    {task ? (
                      <>
                        <Text style={styles.cellShadeText}>#{task.shade_number}</Text>
                        <View style={styles.cellPlyRow}>
                           <Text style={styles.cellPlyText}>{task.springs_2ply} + {task.springs_3ply}</Text>
                        </View>
                        <Text style={styles.cellStatusText}>
                          {task.status === 'completed' ? '✓' : 
                           task.status === 'rejected' ? '✕' : 
                           task.status === 'in-progress' ? '...' : ''}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.emptyCellText}>-</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {renderTaskEditModal()}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    backgroundColor: '#1a1a2e'
  },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1 },
  dateInputContainer: {
    backgroundColor: '#0f0f1e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateText: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold' },
  scroll: { padding: 12 },
  gridRow: { flexDirection: 'row', marginBottom: 8 },
  rowNumberCell: { width: 30, justifyContent: 'center', alignItems: 'center' },
  rowNumberText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  machineInfoCard: {
    width: 80, height: 90, backgroundColor: '#4CAF50', borderRadius: 8, marginHorizontal: 4,
    padding: 8, justifyContent: 'center', alignItems: 'center'
  },
  machineNameText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  machineWeightText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  machineCountText: { color: '#fff', fontWeight: '600', fontSize: 14, marginTop: 4 },
  gridCell: {
    width: 80, height: 100, borderRadius: 8, marginHorizontal: 4,
    padding: 8, justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a3e'
  },
  cellShadeText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  cellPlyRow: { alignItems: 'center' },
  cellPlyText: { color: '#888', fontSize: 10 },
  cellStatusText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyCellText: { color: '#333' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  },
  modalContent: {
    width: '90%', backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#2a2a3e'
  },
  closeModalButton: { alignSelf: 'flex-end', padding: 8 },
  closeModalButtonText: { color: '#888', fontSize: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  shadeText: { fontSize: 18, color: '#fff', marginBottom: 4, textAlign: 'center' },
  springText: { fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' },
  weightRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  weightInput: { flex: 1 },
  label: { fontSize: 12, color: '#aaa', marginBottom: 6 },
  input: { backgroundColor: '#0f0f1e', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 20 },
  startButton: { flex: 1, minWidth: 100, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  completeButton: { flex: 1, minWidth: 100, backgroundColor: '#2196F3', padding: 15, borderRadius: 10, alignItems: 'center' },
  rejectButton: { flex: 1, minWidth: 100, backgroundColor: '#f44336', padding: 15, borderRadius: 10, alignItems: 'center' },
  revokeButton: { width: '100%', backgroundColor: '#FF9800', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  doneButton: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  doneButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  timeText: { fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' },
  loadingText: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 100 },
  paymentCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 2, borderColor: '#4CAF50' },
  paymentTitle: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginBottom: 16 },
  paymentSection: { backgroundColor: '#0f0f1e', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  rejectedSection: { borderLeftColor: '#f44336' },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50', marginBottom: 12 },
  sectionLabelRejected: { fontSize: 16, fontWeight: 'bold', color: '#f44336', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontSize: 14, color: '#aaa' },
  paymentValue: { fontSize: 14, color: '#fff', fontWeight: '600' },
  totalRow: { borderTopWidth: 2, borderTopColor: '#333', paddingTop: 16, marginTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  totalPayment: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  statText: { fontSize: 13, color: '#888' },
});
