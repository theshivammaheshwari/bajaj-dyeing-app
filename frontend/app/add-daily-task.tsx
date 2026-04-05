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
    m1: [{ id: '1', shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }],
    m2: [{ id: '1', shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }],
    m3: [{ id: '1', shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }],
    m4: [{ id: '1', shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }],
    m5: [{ id: '1', shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }],
  });

  useEffect(() => {
    fetchShades();
  }, []);

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
        showAlert('Success', 'Daily task added successfully', () => router.back());
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
    if (!activeTask) return null;

    const { machineId, taskId } = activeTask;
    const task = machineTasks[machineId].find(t => t.id === taskId);
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

          <Text style={styles.modalTitle}>Edit {MACHINES.find(m => m.id === machineId)?.name} Task</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Search Shade Number</Text>
            <TextInput
              style={styles.shadeSearchInput}
              placeholder="Type shade number..."
              placeholderTextColor="#666"
              value={task.shadeSearchText}
              onChangeText={(value) => {
                updateTask(machineId, task.id, 'shadeSearchText', value);
                updateTask(machineId, task.id, 'showShadeDropdown', true);
              }}
              onFocus={() => updateTask(machineId, task.id, 'showShadeDropdown', true)}
              keyboardType="number-pad"
            />
            {task.shadeId && (
              <View style={styles.selectedShade}>
                <Text style={styles.selectedShadeText}>Selected: Shade #{task.shadeNumber}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    updateTask(machineId, task.id, 'shadeId', '');
                    updateTask(machineId, task.id, 'shadeNumber', '');
                    updateTask(machineId, task.id, 'shadeSearchText', '');
                  }}
                >
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {task.showShadeDropdown && !task.shadeId && (
              <View style={styles.shadeDropdown}>
                <ScrollView 
                  style={[styles.shadeDropdownScroll, { maxHeight: 150 }]} 
                  nestedScrollEnabled={true} 
                  keyboardShouldPersistTaps="handled"
                >
                  {getFilteredShades(task.shadeSearchText).slice(0, 10).map((shade) => (
                    <TouchableOpacity
                      key={shade.id}
                      style={styles.shadeDropdownItem}
                      onPress={() => updateTask(machineId, task.id, 'shadeId', shade.id)}
                    >
                      <Text style={styles.shadeDropdownText}>Shade #{shade.shade_number}</Text>
                    </TouchableOpacity>
                  ))}
                  {getFilteredShades(task.shadeSearchText).length === 0 && (
                    <Text style={styles.noShadesText}>No shades found</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.springRow}>
            <View style={styles.springInput}>
              <Text style={styles.label}>2 PLY</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={task.springs2ply}
                onChangeText={(value) => updateTask(machineId, task.id, 'springs2ply', value)}
              />
            </View>

            <View style={styles.springInput}>
              <Text style={styles.label}>3 PLY</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={task.springs3ply}
                onChangeText={(value) => updateTask(machineId, task.id, 'springs3ply', value)}
              />
            </View>
          </View>
          
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
                  return (
                    <TouchableOpacity 
                      key={machine.id} 
                      style={styles.gridCell}
                      onPress={() => task && setActiveTask({ machineId: machine.id, taskId: task.id })}
                    >
                      {task ? (
                        <>
                          <Text style={styles.cellShadeText}>
                            {task.shadeNumber ? `Shade #${task.shadeNumber}` : 'Shade'}
                          </Text>
                          <View style={styles.cellPlyRow}>
                            <View style={styles.plyBadge}>
                              <Text style={styles.plyBadgeText}>{task.springs2ply || 0}P</Text>
                            </View>
                            <Text style={styles.plyPlusText}>+</Text>
                            <View style={styles.plyBadge}>
                              <Text style={styles.plyBadgeText}>{task.springs3ply || 0}P</Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.emptyCellText}>-</Text>
                      )}
                    </TouchableOpacity>
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

        {renderTaskEditModal()}

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
    width: 80,
    height: 90,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
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
    width: 80,
    height: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginHorizontal: 4,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cellShadeText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  cellPlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plyBadge: {
    backgroundColor: '#0f0f1e',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plyBadgeText: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plyPlusText: {
    color: '#333',
    fontSize: 8,
  },
  emptyCellText: {
    color: '#333',
  },
  gridAddRowButton: {
    width: 420, // (80+8)*5 minus margin gaps approx
    height: 50,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 12,
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
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  closeModalButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeModalButtonText: {
    color: '#888',
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f0f1e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
  },
  shadeSearchInput: {
    backgroundColor: '#0f0f1e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
  },
  selectedShade: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedShadeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  clearText: {
    color: '#fff',
    fontWeight: 'bold',
    padding: 4,
  },
  shadeDropdown: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  shadeDropdownScroll: {
    maxHeight: 200,
  },
  shadeDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  shadeDropdownText: {
    color: '#fff',
  },
  noShadesText: {
    color: '#888',
    padding: 12,
    textAlign: 'center',
  },
  springRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  springInput: {
    flex: 1,
  },
  doneButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
});

