import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

interface Shade {
  id: string;
  shade_number: string;
}

interface MachineTaskData {
  id: string;
  shadeId: string;
  shadeNumber: string;
  springs2ply: string;
  springs3ply: string;
  showShadeDropdown: boolean;
  shadeSearchText: string;
}

export default function AddDailyTask() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Each machine has an array of tasks
  const [machineTasks, setMachineTasks] = useState<{ [key: string]: MachineTaskData[] }>({
    m1: Array.from({ length: 5 }, (_, i) => ({ id: `m1-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m2: Array.from({ length: 5 }, (_, i) => ({ id: `m2-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m3: Array.from({ length: 5 }, (_, i) => ({ id: `m3-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m4: Array.from({ length: 5 }, (_, i) => ({ id: `m4-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m5: Array.from({ length: 5 }, (_, i) => ({ id: `m5-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
  });

  useEffect(() => {
    fetchShades();
    fetchExistingTask();
  }, [date]);

  const fetchExistingTask = async () => {
    try {
      console.log('Fetching tasks for date:', date);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${date}`);
      const data = await response.json();
      
      if (data.id) {
        console.log('Found existing task:', data.id);
        const newMachineTasks: { [key: string]: MachineTaskData[] } = {};
        MACHINES.forEach(m => {
          const apiTasks = data[m.id] || [];
          newMachineTasks[m.id] = apiTasks.map((t: any, idx: number) => ({
            id: `${m.id}-${idx}`,
            shadeId: t.shade_id || '',
            shadeNumber: t.shade_number ? String(t.shade_number) : '',
            springs2ply: t.springs_2ply !== undefined ? String(t.springs_2ply) : '0',
            springs3ply: t.springs_3ply !== undefined ? String(t.springs_3ply) : '0',
            showShadeDropdown: false,
            shadeSearchText: t.shade_number ? String(t.shade_number) : ''
          }));
          // Pad to 5 rows
          while (newMachineTasks[m.id].length < 5) {
            newMachineTasks[m.id].push({
              id: `${m.id}-${newMachineTasks[m.id].length}`,
              shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: ''
            });
          }
        });
        setMachineTasks(newMachineTasks);
      } else {
        console.log('No tasks found for this date, resetting grid');
        // Reset to empty state for new date
        setMachineTasks({
          m1: Array.from({ length: 5 }, (_, i) => ({ id: `m1-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
          m2: Array.from({ length: 5 }, (_, i) => ({ id: `m2-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
          m3: Array.from({ length: 5 }, (_, i) => ({ id: `m3-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
          m4: Array.from({ length: 5 }, (_, i) => ({ id: `m4-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
          m5: Array.from({ length: 5 }, (_, i) => ({ id: `m5-${i}`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
        });
      }
    } catch (error) {
      console.error('Error fetching existing task:', error);
    }
  };

  const fetchShades = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades`);
      const data = await response.json();
      // Sort shades numerically by shade_number
      const sortedShades = data.sort((a: Shade, b: Shade) => {
        const numA = parseInt(a.shade_number) || 0;
        const numB = parseInt(b.shade_number) || 0;
        return numA - numB;
      });
      setShades(sortedShades);
    } catch (error) {
      console.error('Error fetching shades:', error);
    }
  };

  const addTaskToMachine = (machineId: string) => {
    const newTask: MachineTaskData = {
      id: Date.now().toString(),
      shadeId: '',
      shadeNumber: '',
      springs2ply: '',
      springs3ply: '',
      showShadeDropdown: false,
      shadeSearchText: '',
    };
    setMachineTasks({
      ...machineTasks,
      [machineId]: [...machineTasks[machineId], newTask],
    });
  };

  const removeTaskFromMachine = (machineId: string, taskId: string) => {
    if (machineTasks[machineId].length > 1) {
      setMachineTasks({
        ...machineTasks,
        [machineId]: machineTasks[machineId].filter((task) => task.id !== taskId),
      });
    }
  };

  const updateTask = (machineId: string, taskId: string, field: string, value: string | boolean) => {
    const machine = MACHINES.find(m => m.id === machineId);
    const max = machine?.totalSprings || 0;

    if (field === 'shadeId') {
      const selectedShade = shades.find((s) => s.id === value);
      setMachineTasks({
        ...machineTasks,
        [machineId]: machineTasks[machineId].map((task) =>
          task.id === taskId
            ? { 
                ...task, 
                shadeId: value as string, 
                shadeNumber: selectedShade?.shade_number || '',
                shadeSearchText: selectedShade?.shade_number || '',
                showShadeDropdown: false 
              }
            : task
        ),
      });
    } else if (field === 'springs2ply' || field === 'springs3ply') {
      const numVal = parseInt(value as string) || 0;
      if (numVal < 0) return;
      if (numVal > max) return;

      const otherField = field === 'springs2ply' ? 'springs3ply' : 'springs2ply';
      const otherVal = Math.max(0, max - numVal).toString();

      setMachineTasks({
        ...machineTasks,
        [machineId]: machineTasks[machineId].map((task) =>
          task.id === taskId ? { 
            ...task, 
            [field]: value,
            [otherField]: otherVal 
          } : task
        ),
      });
    } else {
      setMachineTasks({
        ...machineTasks,
        [machineId]: machineTasks[machineId].map((task) =>
          task.id === taskId ? { ...task, [field]: value } : task
        ),
      });
    }
  };

  const getFilteredShades = (searchText: string) => {
    if (!searchText.trim()) return shades;
    return shades.filter(shade => 
      shade.shade_number.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const [activeTask, setActiveTask] = useState<{ machineId: string; taskId: string } | null>(null);

  const maxRows = Math.max(...Object.values(machineTasks).map(tasks => tasks.length));

  const addRow = () => {
    const updatedTasks = { ...machineTasks };
    MACHINES.forEach(machine => {
      const newTask: MachineTaskData = {
        id: Date.now().toString() + Math.random(),
        shadeId: '',
        shadeNumber: '',
        springs2ply: '',
        springs3ply: '',
        showShadeDropdown: false,
        shadeSearchText: '',
      };
      updatedTasks[machine.id] = [...updatedTasks[machine.id], newTask];
    });
    setMachineTasks(updatedTasks);
  };

  // Helper function for showing alerts (web compatible)
  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const validateAndSave = async () => {
    if (!date) {
      showAlert('Error', 'Please select a date');
      return;
    }

    const payload: any = { date };
    let hasData = false;

    for (const machine of MACHINES) {
      const tasks = machineTasks[machine.id];
      const validTasks = [];

      for (const task of tasks) {
        if (task.shadeId && (task.springs2ply || task.springs3ply)) {
          const ply2 = parseInt(task.springs2ply) || 0;
          const ply3 = parseInt(task.springs3ply) || 0;

          validTasks.push({
            shade_id: task.shadeId,
            shade_number: task.shadeNumber,
            springs_2ply: ply2,
            springs_3ply: ply3,
            weight: machine.capacity,
          });
        }
      }

      // Check total springs don't exceed machine capacity
      const totalSprings = validTasks.reduce((sum, t) => sum + t.springs_2ply + t.springs_3ply, 0);
      if (totalSprings > machine.totalSprings) {
        showAlert('Error', `${machine.name}: Total springs (${totalSprings}) exceeds capacity (${machine.totalSprings})`);
        return;
      }

      if (validTasks.length > 0) {
        payload[machine.id] = validTasks;
        hasData = true;
      }
    }

    if (!hasData) {
      showAlert('Error', 'Please add at least one task');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showAlert('Success', 'Daily task saved successfully', () => router.back());
      } else {
        const error = await response.json();
        showAlert('Error', error.detail || 'Failed to add task');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      showAlert('Error', 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const renderMachineForm = (machine: typeof MACHINES[0]) => {
    return null; // Logic is now handled by the grid layout
  };

  const renderTaskEditModal = () => {
    return null; // Modal removed for inline interaction
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1e" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Daily Task</Text>

          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          horizontal={true}
        >
          <View>
            {/* Top Row: Machine Cards */}
            <View style={styles.gridRow}>
              <View style={styles.rowNumberCell}>
                <Text style={styles.rowNumberText}>#</Text>
              </View>
              {MACHINES.map(machine => {
                const tasks = machineTasks[machine.id];
                const totalSpringsUsed = tasks.reduce((sum, task) => 
                  sum + (parseInt(task.springs2ply) || 0) + (parseInt(task.springs3ply) || 0), 0
                );
                return (
                  <View key={machine.id} style={styles.machineInfoCard}>
                    <Text style={styles.machineNameText}>{machine.name}</Text>
                    <Text style={styles.machineWeightText}>{machine.capacity}kg</Text>
                    <Text style={styles.machineCountText}>{totalSpringsUsed}/{machine.totalSprings}</Text>
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
                  const task = machineTasks[machine.id][rowIndex];
                  const isActive = activeTask?.machineId === machine.id && activeTask?.taskId === task?.id;

                  return (
                    <View 
                      key={machine.id} 
                      style={[
                        styles.gridCell, 
                        isActive && styles.activeGridCell,
                        task?.shadeId ? styles.filledGridCell : null
                      ]}
                    >
                      {task ? (
                        <>
                          <TouchableOpacity 
                            style={styles.cellHeader} 
                            onPress={() => setActiveTask(isActive ? null : { machineId: machine.id, taskId: task.id })}
                          >
                            <Text style={[styles.cellShadeText, task.shadeNumber ? styles.filledText : null]}>
                              {task.shadeNumber ? `#${task.shadeNumber}` : 'Shade'}
                            </Text>
                          </TouchableOpacity>

                          {isActive ? (
                            <View style={styles.inlineEditor}>
                              <TextInput
                                style={styles.inlineShadeInput}
                                placeholder="Shade..."
                                placeholderTextColor="#444"
                                value={task.shadeSearchText}
                                onChangeText={(value) => {
                                  updateTask(machine.id, task.id, 'shadeSearchText', value);
                                  updateTask(machine.id, task.id, 'showShadeDropdown', true);
                                }}
                                onFocus={() => updateTask(machine.id, task.id, 'showShadeDropdown', true)}
                                keyboardType="number-pad"
                                autoFocus
                              />
                              
                              {task.showShadeDropdown && (
                                <View style={styles.inlineDropdown}>
                                  <View style={{ maxHeight: 200, minHeight: 40 }}>
                                    <ScrollView 
                                      nestedScrollEnabled={true} 
                                      keyboardShouldPersistTaps="handled"
                                      contentContainerStyle={{ flexGrow: 1 }}
                                    >
                                      {getFilteredShades(task.shadeSearchText).length > 0 ? (
                                        getFilteredShades(task.shadeSearchText).map((shade) => (
                                          <TouchableOpacity
                                            key={shade.id}
                                            style={styles.inlineDropdownItem}
                                            onPress={() => {
                                              updateTask(machine.id, task.id, 'shadeId', shade.id);
                                            }}
                                          >
                                            <Text style={styles.inlineDropdownText}>#{shade.shade_number}</Text>
                                          </TouchableOpacity>
                                        ))
                                      ) : (
                                        <View style={styles.inlineDropdownItem}>
                                          <Text style={[styles.inlineDropdownText, { color: '#666' }]}>No Match</Text>
                                        </View>
                                      )}
                                    </ScrollView>
                                  </View>
                                </View>
                              )}

                              <View style={styles.inlinePlyRow}>
                                <View style={styles.inlinePlyInputWrap}>
                                  <Text style={styles.inlinePlyLabel}>2P</Text>
                                  <TextInput
                                    style={styles.inlinePlyInput}
                                    value={task.springs2ply}
                                    onChangeText={(val) => updateTask(machine.id, task.id, 'springs2ply', val)}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor="#444"
                                  />
                                </View>
                                <View style={styles.inlinePlyInputWrap}>
                                  <Text style={styles.inlinePlyLabel}>3P</Text>
                                  <TextInput
                                    style={styles.inlinePlyInput}
                                    value={task.springs3ply}
                                    onChangeText={(val) => updateTask(machine.id, task.id, 'springs3ply', val)}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor="#444"
                                  />
                                </View>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.cellSummary}
                              onPress={() => {
                                // Close if already active, otherwise open
                                if (activeTask?.machineId === machine.id && activeTask?.taskId === task.id) {
                                  setActiveTask(null);
                                } else {
                                  setActiveTask({ machineId: machine.id, taskId: task.id });
                                }
                              }}
                            >
                              <View style={styles.summaryPlyRow}>
                                <Text style={styles.summaryPlyText}>{task.springs2ply || 0}P</Text>
                                <Text style={styles.summaryPlyDivider}>+</Text>
                                <Text style={styles.summaryPlyText}>{task.springs3ply || 0}P</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={styles.emptyCellText}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Add Row Button */}
            <TouchableOpacity style={styles.gridAddRowButton} onPress={addRow}>
              <Text style={styles.gridAddRowText}>+ Add Row</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={validateAndSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : '✓ Save Daily Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  dateInputContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
  },
  dateInput: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowNumberCell: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumberText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 12,
  },
  machineInfoCard: {
    width: 90,
    height: 90,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineNameText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  machineWeightText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  machineCountText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
  gridCell: {
    width: 90,
    minHeight: 110,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    justifyContent: 'center',
  },
  activeGridCell: {
    borderColor: '#4CAF50',
    backgroundColor: '#1e1e30',
    zIndex: 10,
    elevation: 5,
  },
  filledGridCell: {
    borderColor: '#2e7d32',
  },
  cellHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    paddingBottom: 4,
    marginBottom: 6,
  },
  cellShadeText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filledText: {
    color: '#4CAF50',
  },
  inlineEditor: {
    marginTop: 2,
  },
  inlineShadeInput: {
    backgroundColor: '#0f0f1e',
    borderRadius: 6,
    padding: 6,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
  },
  inlineDropdown: {
    position: 'absolute',
    top: 35, // Adjusted to be slightly below the input
    left: 0,
    right: 0,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    maxHeight: 250, // Increased height
    zIndex: 1000, // Higher zIndex to overlap everything
    elevation: 10,
    borderWidth: 2, // Thicker border
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  inlineDropdownItem: {
    padding: 12, // More padding for touch targets
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  inlineDropdownText: {
    color: '#fff',
    fontSize: 14, // Larger text
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inlinePlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 4,
  },
  inlinePlyInputWrap: {
    flex: 1,
    alignItems: 'center',
  },
  inlinePlyLabel: {
    color: '#555',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  inlinePlyInput: {
    backgroundColor: '#0f0f1e',
    borderRadius: 6,
    width: '100%',
    padding: 4,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cellSummary: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryPlyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  summaryPlyText: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryPlyDivider: {
    color: '#333',
    fontSize: 10,
  },
  emptyCellText: {
    color: '#222',
    textAlign: 'center',
  },
  gridAddRowButton: {
    width: 470, // Adjusted for 90px cells
    height: 50,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridAddRowText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#0f0f1e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
});

