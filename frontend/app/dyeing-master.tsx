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
  const [activeTask, setActiveTask] = useState<{ machineId: string; taskIndex: number } | null>(null);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dyeing Master</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Worker Panel</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: colors.badgeBackground }]}>
            <Text style={{ fontSize: 20 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.dateBar, { backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={[styles.dateInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.dateInput, { color: colors.primary }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        horizontal={true}
        showsHorizontalScrollIndicator={true}
      >
        <View>
          {/* Top Row: Machine Info Cards */}
          <View style={styles.gridRow}>
            <View style={styles.rowNumberCell}>
              <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>#</Text>
            </View>
            {MACHINES.map(machine => {
              const tasks = dailyTask?.[machine.id] || [];
              const totalSpringsUsed = tasks.reduce((sum: number, task: any) => 
                sum + (task.springs_2ply || 0) + (task.springs_3ply || 0), 0
              );
              return (
                <View key={machine.id} style={[styles.machineInfoCard, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.machineNameText, { color: '#fff' }]}>{machine.name}</Text>
                  <Text style={[styles.machineWeightText, { color: 'rgba(255,255,255,0.7)' }]}>{machine.capacity}kg</Text>
                  <Text style={[styles.machineCountText, { color: '#fff' }]}>{totalSpringsUsed}/{machine.totalSprings}</Text>
                </View>
              );
            })}
          </View>

          {/* Task Grid Rows */}
          {!dailyTask && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found for {date}</Text>
            </View>
          ) : (
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                <View style={styles.rowNumberCell}>
                  <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>{rowIndex + 1}</Text>
                </View>
                {MACHINES.map(machine => {
                  const tasks = dailyTask?.[machine.id] || [];
                  const task = tasks[rowIndex];
                  const isActive = activeTask?.machineId === machine.id && activeTask?.taskIndex === rowIndex;

                  return (
                    <View 
                      key={machine.id} 
                      style={[
                        styles.gridCell, 
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isActive && [styles.activeGridCell, { borderColor: colors.primary, borderWidth: 2 }],
                        task ? (
                          task.status === 'completed' ? [styles.completedCell, { backgroundColor: theme === 'dark' ? '#1a2e1a' : '#e8f5e9' }] :
                          task.status === 'rejected' ? [styles.rejectedCell, { backgroundColor: theme === 'dark' ? '#2e1a1a' : '#ffebee' }] :
                          task.status === 'in-progress' ? [styles.progressCell, { backgroundColor: theme === 'dark' ? '#1a202e' : '#e3f2fd' }] :
                          null
                        ) : null
                      ]}
                    >
                      {task ? (
                        <>
                          <TouchableOpacity 
                            style={styles.cellHeader} 
                            onPress={() => router.push(`/shade-detail?shadeId=${task.shade_id}`)}
                          >
                            <Text style={[styles.cellShadeText, { color: colors.primary }]}>
                              #{task.shade_number}
                            </Text>
                            <TouchableOpacity 
                              onPress={() => setActiveTask(isActive ? null : { machineId: machine.id, taskIndex: rowIndex })}
                              style={styles.statusToggle}
                            >
                              <Text style={[styles.statusIndicator, { 
                                color: task.status === 'completed' ? colors.success : 
                                       task.status === 'rejected' ? colors.danger : 
                                       task.status === 'in-progress' ? colors.secondary : 
                                       colors.textSecondary 
                              }]}>
                                {task.status === 'completed' ? '✓' : 
                                 task.status === 'rejected' ? '✕' : 
                                 task.status === 'in-progress' ? '●' : '○'}
                              </Text>
                            </TouchableOpacity>
                          </TouchableOpacity>

                          {isActive ? (
                            <View style={styles.inlineEditor}>
                              <View style={styles.weightInputsContainer}>
                                <View style={styles.weightInputWrap}>
                                  <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>2P kg</Text>
                                  <TextInput
                                    style={[styles.smallInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                    value={weightInputs[`${machine.id}-${rowIndex}`]?.ply2 || ''}
                                    onChangeText={(val) => updateLocalWeight(machine.id, rowIndex, 'ply2', val)}
                                    onBlur={() => saveWeight(machine.id, rowIndex, 'ply2')}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                  />
                                </View>
                                <View style={styles.weightInputWrap}>
                                  <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>3P kg</Text>
                                  <TextInput
                                    style={[styles.smallInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                    value={weightInputs[`${machine.id}-${rowIndex}`]?.ply3 || ''}
                                    onChangeText={(val) => updateLocalWeight(machine.id, rowIndex, 'ply3', val)}
                                    onBlur={() => saveWeight(machine.id, rowIndex, 'ply3')}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                  />
                                </View>
                              </View>

                              <View style={styles.actionButtons}>
                                {task.status !== 'in-progress' && task.status !== 'completed' && task.status !== 'rejected' && (
                                  <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: colors.primary }]} onPress={() => startTask(machine.id, rowIndex)}>
                                    <Text style={styles.actionButtonText}>Start</Text>
                                  </TouchableOpacity>
                                )}
                                {task.status === 'in-progress' && (
                                  <View style={styles.progressActions}>
                                    <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: colors.success }]} onPress={() => completeTask(machine.id, rowIndex)}>
                                      <Text style={styles.actionButtonText}>✓</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: colors.danger }]} onPress={() => rejectTask(machine.id, rowIndex)}>
                                      <Text style={styles.actionButtonText}>✕</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: colors.textSecondary }]} onPress={() => revokeTask(machine.id, rowIndex, task.status)}>
                                      <Text style={styles.actionButtonText}>↺</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                                {(task.status === 'completed' || task.status === 'rejected') && (
                                  <TouchableOpacity style={[styles.smallActionButton, { backgroundColor: colors.textSecondary, width: '100%' }]} onPress={() => revokeTask(machine.id, rowIndex, task.status)}>
                                    <Text style={styles.actionButtonText}>Reset Task</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          ) : (
                            <View style={styles.cellSummary}>
                              <Text style={[styles.plyCountText, { color: colors.textSecondary }]}>
                                {task.springs_2ply || 0}P + {task.springs_3ply || 0}P
                              </Text>
                              {(task.ply2_weight > 0 || task.ply3_weight > 0) && (
                                <Text style={[styles.weightSumText, { color: colors.text }]}>
                                  {(task.ply2_weight || 0 + task.ply3_weight || 0).toFixed(2)} kg
                                </Text>
                              )}
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={[styles.emptyCellText, { color: colors.textSecondary }]}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}

          {payment && (
            <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>💰 Payment Summary</Text>
              <View style={styles.paymentFlex}>
                <View style={styles.paymentStat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>₹{payment.completed_payment}</Text>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>{payment.completed_kg} kg</Text>
                </View>
                <View style={styles.paymentStat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
                  <Text style={[styles.statValue, { color: colors.danger }]}>₹{payment.rejected_payment}</Text>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>{payment.rejected_kg} kg</Text>
                </View>
                <View style={styles.paymentStat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
                  <Text style={[styles.statValueTotal, { color: colors.primary }]}>₹{payment.total_payment}</Text>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>{payment.total_kg} kg</Text>
                </View>
              </View>
            </View>
          )}
        </View>
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
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  themeToggle: { padding: 8, borderRadius: 12 },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  dateBar: { padding: 12 },
  dateInputContainer: { 
    borderRadius: 8, 
    borderWidth: 1, 
    paddingHorizontal: 12,
  },
  dateInput: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    paddingVertical: 6,
  },
  scroll: { padding: 12, paddingBottom: 100 },
  gridRow: { flexDirection: 'row', marginBottom: 8 },
  rowNumberCell: { width: 30, justifyContent: 'center', alignItems: 'center' },
  rowNumberText: { fontWeight: 'bold', fontSize: 12 },
  machineInfoCard: {
    width: 90, height: 90, borderRadius: 12, marginHorizontal: 4, 
    padding: 8, justifyContent: 'center', alignItems: 'center'
  },
  machineNameText: { fontWeight: 'bold', fontSize: 18 },
  machineWeightText: { fontSize: 10 },
  machineCountText: { fontWeight: '600', fontSize: 14, marginTop: 4 },
  gridCell: {
    width: 90, minHeight: 120, borderRadius: 12, marginHorizontal: 4, 
    padding: 6, borderWidth: 1, justifyContent: 'center'
  },
  activeGridCell: { zIndex: 10, elevation: 5 },
  cellHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 4, marginBottom: 4 
  },
  cellShadeText: { fontSize: 13, fontWeight: 'bold' },
  statusIndicator: { fontSize: 14, fontWeight: 'bold' },
  inlineEditor: { flex: 1, justifyContent: 'space-between' },
  weightInputsContainer: { gap: 4, marginBottom: 6 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weightLabel: { fontSize: 9, fontWeight: 'bold', width: 30 },
  smallInput: { 
    flex: 1, borderRadius: 4, borderWidth: 1, padding: 2, 
    fontSize: 10, textAlign: 'center' 
  },
  actionButtons: { marginTop: 2 },
  progressActions: { flexDirection: 'row', gap: 2 },
  smallActionButton: { 
    paddingVertical: 6, borderRadius: 4, alignItems: 'center', 
    justifyContent: 'center', flex: 1 
  },
  actionButtonText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cellSummary: { alignItems: 'center', gap: 2 },
  plyCountText: { fontSize: 10, fontWeight: '600' },
  weightSumText: { fontSize: 12, fontWeight: 'bold' },
  emptyCellText: { textAlign: 'center', fontSize: 20 },
  emptyContainer: { padding: 40, width: 480, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600' },
  completedCell: {},
  rejectedCell: {},
  progressCell: {},
  paymentCard: { 
    marginTop: 24, marginHorizontal: 4, borderRadius: 16, 
    padding: 16, borderWidth: 1, width: 470 
  },
  paymentTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  paymentFlex: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  statValueTotal: { fontSize: 18, fontWeight: 'bold' },
  statSub: { fontSize: 10, marginTop: 2 },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 100 },
});
