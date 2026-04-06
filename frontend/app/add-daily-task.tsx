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
import { useTheme } from '../context/ThemeContext';

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
  const { colors, theme } = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Daily Task</Text>

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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          horizontal={true}
        >
          <View>
            {/* Top Row: Machine Cards */}
            <View style={styles.gridRow}>
              <View style={styles.rowNumberCell}>
                <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>#</Text>
              </View>
              {MACHINES.map(machine => {
                const tasks = machineTasks[machine.id];
                const totalSpringsUsed = tasks.reduce((sum, task) => 
                  sum + (parseInt(task.springs2ply) || 0) + (parseInt(task.springs3ply) || 0), 0
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
            {Array.from({ length: machineTasks.m1.length }).map((_, rowIndex) => (
              <View key={rowIndex} style={[styles.gridRow, { zIndex: machineTasks.m1.length - rowIndex }]}>
                <View style={styles.rowNumberCell}>
                  <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>{rowIndex + 1}</Text>
                </View>
                {MACHINES.map(machine => {
                  const task = machineTasks[machine.id][rowIndex];
                  const isActive = activeTask?.machineId === machine.id && activeTask?.taskId === task?.id;

                  return (
                    <View 
                      key={machine.id} 
                      style={[
                        styles.gridCell, 
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isActive && [styles.activeGridCell, { borderColor: colors.primary, borderWidth: 2 }],
                        task?.shadeId ? [styles.filledGridCell, { backgroundColor: theme === 'dark' ? '#1a2e1a' : '#e8f5e9' }] : null,
                        { zIndex: isActive ? 100 : 1 }
                      ]}
                    >
                      {task ? (
                        <>
                          <TouchableOpacity 
                            style={styles.cellHeader} 
                            onPress={() => {
                              if (task.shadeId) {
                                router.push(`/shade-detail?shadeId=${task.shadeId}`);
                              } else {
                                setActiveTask(isActive ? null : { machineId: machine.id, taskId: task.id });
                              }
                            }}
                          >
                            <Text style={[styles.cellShadeText, { color: colors.textSecondary }, task.shadeNumber ? [styles.filledText, { color: colors.primary }] : null]}>
                              {task.shadeNumber ? `#${task.shadeNumber}` : 'Shade'}
                            </Text>
                          </TouchableOpacity>

                          {isActive ? (
                            <View style={[styles.inlineEditor, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                              <View style={[styles.inlineHeaderActions, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
                                <TextInput
                                  style={[styles.inlineShadeInput, { color: colors.text, borderBottomColor: colors.border, flex: 1 }]}
                                  placeholder="Shade..."
                                  placeholderTextColor={colors.textSecondary}
                                  value={task.shadeSearchText}
                                  onChangeText={(value) => {
                                    updateTask(machine.id, task.id, 'shadeSearchText', value);
                                    updateTask(machine.id, task.id, 'showShadeDropdown', true);
                                  }}
                                  onFocus={() => updateTask(machine.id, task.id, 'showShadeDropdown', true)}
                                  keyboardType="number-pad"
                                  autoFocus
                                />
                                {task.shadeId && (
                                  <TouchableOpacity 
                                    onPress={() => router.push(`/shade-detail?shadeId=${task.shadeId}`)}
                                    style={{ marginLeft: 4, padding: 2 }}
                                  >
                                    <Text style={{ fontSize: 16 }}>👁️</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              
                              {task.showShadeDropdown && (
                                <View style={[styles.inlineDropdown, { backgroundColor: colors.card, borderColor: colors.primary }]}>
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
                                            style={[styles.inlineDropdownItem, { borderBottomColor: colors.border }]}
                                            onPress={() => {
                                              updateTask(machine.id, task.id, 'shadeId', shade.id);
                                            }}
                                          >
                                            <Text style={[styles.inlineDropdownText, { color: colors.text }]}>#{shade.shade_number}</Text>
                                          </TouchableOpacity>
                                        ))
                                      ) : (
                                        <View style={styles.inlineDropdownItem}>
                                          <Text style={[styles.inlineDropdownText, { color: colors.textSecondary }]}>No Match</Text>
                                        </View>
                                      )}
                                    </ScrollView>
                                  </View>
                                </View>
                              )}

                              <View style={styles.inlinePlyRow}>
                                <View style={styles.inlinePlyInputWrap}>
                                  <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>2P</Text>
                                  <TextInput
                                    style={[styles.inlinePlyInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    value={task.springs2ply}
                                    onChangeText={(val) => updateTask(machine.id, task.id, 'springs2ply', val)}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                  />
                                </View>
                                <View style={styles.inlinePlyInputWrap}>
                                  <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>3P</Text>
                                  <TextInput
                                    style={[styles.inlinePlyInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    value={task.springs3ply}
                                    onChangeText={(val) => updateTask(machine.id, task.id, 'springs3ply', val)}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
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
                                <Text style={[styles.summaryPlyText, { color: colors.text }]}>{task.springs2ply || 0}P</Text>
                                <Text style={[styles.summaryPlyDivider, { color: colors.textSecondary }]}>+</Text>
                                <Text style={[styles.summaryPlyText, { color: colors.text }]}>{task.springs3ply || 0}P</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <Text style={[styles.emptyCellText, { color: colors.textSecondary }]}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Add Row Button */}
            <TouchableOpacity style={[styles.gridAddRowButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={addRow}>
              <Text style={[styles.gridAddRowText, { color: colors.primary }]}>+ Add Row</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.headerBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]}
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
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  dateInputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  dateInput: {
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
    fontWeight: 'bold',
    fontSize: 12,
  },
  machineInfoCard: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineNameText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  machineWeightText: {
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
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 6,
    borderWidth: 1,
    justifyContent: 'center',
  },
  activeGridCell: {
    zIndex: 10,
    elevation: 5,
  },
  filledGridCell: {
  },
  cellHeader: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 6,
  },
  cellShadeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filledText: {
  },
  inlineEditor: {
    marginTop: 2,
  },
  inlineShadeInput: {
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    borderWidth: 1,
    textAlign: 'center',
  },
  inlineDropdown: {
    position: 'absolute',
    top: 35, // Adjusted to be slightly below the input
    left: -4, // Slightly wider to cover cell borders
    right: -4,
    borderRadius: 8,
    maxHeight: 250, // Increased height
    zIndex: 10000, // Very high zIndex to overlap everything
    elevation: 20,
    borderWidth: 2, // Thicker border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  inlineDropdownItem: {
    padding: 12, // More padding for touch targets
    borderBottomWidth: 1,
  },
  inlineDropdownText: {
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
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  inlinePlyInput: {
    borderRadius: 6,
    width: '100%',
    padding: 4,
    fontSize: 12,
    textAlign: 'center',
    borderWidth: 1,
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
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryPlyDivider: {
    fontSize: 10,
  },
  emptyCellText: {
    textAlign: 'center',
  },
  gridAddRowButton: {
    width: 470, // Adjusted for 90px cells
    height: 50,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridAddRowText: {
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
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

