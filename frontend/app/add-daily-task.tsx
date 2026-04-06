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

const emptyTask = (machineId: string, index: number): MachineTaskData => ({
  id: `${machineId}-${index}`,
  shadeId: '',
  shadeNumber: '',
  springs2ply: '',
  springs3ply: '',
  showShadeDropdown: false,
  shadeSearchText: '',
});

const initialMachineTasks = () => {
  const tasks: { [key: string]: MachineTaskData[] } = {};
  MACHINES.forEach(m => {
    tasks[m.id] = Array.from({ length: 5 }, (_, i) => emptyTask(m.id, i));
  });
  return tasks;
};

export default function AddDailyTask() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [loading, setLoading] = useState(false);
  const [machineTasks, setMachineTasks] = useState<{ [key: string]: MachineTaskData[] }>(initialMachineTasks());
  const [activeTask, setActiveTask] = useState<{ machineId: string; taskId: string } | null>(null);

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
            shadeSearchText: t.shade_number ? String(t.shade_number) : '',
          }));
          while (newMachineTasks[m.id].length < 5) {
            newMachineTasks[m.id].push(emptyTask(m.id, newMachineTasks[m.id].length));
          }
        });
        setMachineTasks(newMachineTasks);
      } else {
        console.log('No tasks found for this date, resetting grid');
        setMachineTasks(initialMachineTasks());
      }
    } catch (error) {
      console.error('Error fetching existing task:', error);
    }
  };

  const fetchShades = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades`);
      const data = await response.json();
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

  const updateTask = (machineId: string, taskId: string, field: string, value: string | boolean) => {
    const machine = MACHINES.find(m => m.id === machineId);
    const max = machine?.totalSprings || 0;

    if (field === 'shadeId') {
      const selectedShade = shades.find(s => s.id === value);
      setMachineTasks(prev => ({
        ...prev,
        [machineId]: prev[machineId].map(task =>
          task.id === taskId
            ? {
                ...task,
                shadeId: value as string,
                shadeNumber: selectedShade?.shade_number || '',
                shadeSearchText: selectedShade?.shade_number || '',
                showShadeDropdown: false,
              }
            : task
        ),
      }));
    } else if (field === 'springs2ply' || field === 'springs3ply') {
      const numVal = parseInt(value as string) || 0;
      if (numVal < 0 || numVal > max) return;
      const otherField = field === 'springs2ply' ? 'springs3ply' : 'springs2ply';
      const otherVal = Math.max(0, max - numVal).toString();
      setMachineTasks(prev => ({
        ...prev,
        [machineId]: prev[machineId].map(task =>
          task.id === taskId
            ? { ...task, [field]: value, [otherField]: otherVal }
            : task
        ),
      }));
    } else {
      setMachineTasks(prev => ({
        ...prev,
        [machineId]: prev[machineId].map(task =>
          task.id === taskId ? { ...task, [field]: value } : task
        ),
      }));
    }
  };

  const getFilteredShades = (searchText: string) => {
    if (!searchText.trim()) return shades;
    return shades.filter(shade =>
      shade.shade_number.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const addRow = () => {
    setMachineTasks(prev => {
      const updated = { ...prev };
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
        updated[machine.id] = [...updated[machine.id], newTask];
      });
      return updated;
    });
  };

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
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBackground}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          style={styles.verticalScrollView}
          contentContainerStyle={styles.verticalScrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            style={styles.horizontalScrollView}
            contentContainerStyle={styles.horizontalScrollContent}
            showsHorizontalScrollIndicator={true}
            horizontal={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.gridContainer}>
              {/* Machine Header Row */}
              <View style={styles.gridRow}>
                <View style={styles.rowNumberCell}>
                  <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>#</Text>
                </View>
                {MACHINES.map(machine => {
                  const tasks = machineTasks[machine.id];
                  const totalSpringsUsed = tasks.reduce(
                    (sum, task) => sum + (parseInt(task.springs2ply) || 0) + (parseInt(task.springs3ply) || 0),
                    0
                  );
                  return (
                    <View key={machine.id} style={[styles.machineInfoCard, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.machineNameText, { color: '#fff' }]}>{machine.name}</Text>
                      <View style={styles.machineStats}>
                        <Text style={[styles.machineWeightText, { color: 'rgba(255,255,255,0.7)' }]}>
                          {machine.capacity}kg
                        </Text>
                        <Text style={[styles.machineCountText, { color: '#fff' }]}>
                          {totalSpringsUsed}/{machine.totalSprings}
                        </Text>
                      </View>
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
                    const isActive =
                      activeTask?.machineId === machine.id && activeTask?.taskId === task?.id;

                    return (
                      <View
                        key={machine.id}
                        style={[
                          styles.gridCell,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isActive && [styles.activeGridCell, { borderColor: colors.primary, borderWidth: 2 }],
                          task?.shadeId
                            ? [styles.filledGridCell, { backgroundColor: theme === 'dark' ? '#1a2e1a' : '#e8f5e9' }]
                            : null,
                          { zIndex: isActive ? 100 : 1 },
                        ]}
                      >
                        {task ? (
                          <>
                            <TouchableOpacity
                              style={styles.cellHeader}
                              onPress={() => {
                                if (task.shadeId && !isActive) {
                                  router.push(`/shade-detail?shadeId=${task.shadeId}`);
                                } else {
                                  setActiveTask(isActive ? null : { machineId: machine.id, taskId: task.id });
                                }
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.cellShadeText,
                                  { color: colors.textSecondary },
                                  task.shadeNumber ? [styles.filledText, { color: colors.primary }] : null,
                                ]}
                              >
                                {task.shadeNumber ? `#${task.shadeNumber}` : 'Select Shade'}
                              </Text>
                              {!isActive && (
                                <Text style={[styles.editIcon, { color: colors.textSecondary }]}>✎</Text>
                              )}
                            </TouchableOpacity>

                            {isActive ? (
                              <View style={[styles.inlineEditor, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                                <View style={styles.inlineHeaderActions}>
                                  <TextInput
                                    style={[styles.inlineShadeInput, { color: colors.text, borderBottomColor: colors.border }]}
                                    placeholder="Shade #"
                                    placeholderTextColor={colors.textSecondary}
                                    value={task.shadeSearchText}
                                    onChangeText={value => {
                                      updateTask(machine.id, task.id, 'shadeSearchText', value);
                                      updateTask(machine.id, task.id, 'showShadeDropdown', true);
                                    }}
                                    onFocus={() => updateTask(machine.id, task.id, 'showShadeDropdown', true)}
                                    keyboardType="number-pad"
                                    autoFocus
                                  />
                                  <TouchableOpacity
                                    onPress={() => setActiveTask(null)}
                                    style={styles.closeEditorBtn}
                                  >
                                    <Text style={{ color: colors.danger, fontWeight: 'bold' }}>✕</Text>
                                  </TouchableOpacity>
                                </View>

                                {task.showShadeDropdown && (
                                  <View
                                    style={[
                                      styles.inlineDropdown,
                                      { backgroundColor: colors.card, borderColor: colors.primary },
                                    ]}
                                  >
                                    <ScrollView
                                      nestedScrollEnabled={true}
                                      keyboardShouldPersistTaps="handled"
                                      style={{ maxHeight: 150 }}
                                    >
                                      {getFilteredShades(task.shadeSearchText).length > 0 ? (
                                        getFilteredShades(task.shadeSearchText).map(shade => (
                                          <TouchableOpacity
                                            key={shade.id}
                                            style={[styles.inlineDropdownItem, { borderBottomColor: colors.border }]}
                                            onPress={() => updateTask(machine.id, task.id, 'shadeId', shade.id)}
                                          >
                                            <Text style={[styles.inlineDropdownText, { color: colors.text }]}>
                                              #{shade.shade_number}
                                            </Text>
                                          </TouchableOpacity>
                                        ))
                                      ) : (
                                        <View style={styles.inlineDropdownItem}>
                                          <Text style={[styles.inlineDropdownText, { color: colors.textSecondary }]}>
                                            No Match
                                          </Text>
                                        </View>
                                      )}
                                    </ScrollView>
                                  </View>
                                )}

                                <View style={styles.inlinePlyRow}>
                                  <View style={styles.inlinePlyInputWrap}>
                                    <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>2P</Text>
                                    <TextInput
                                      style={[
                                        styles.inlinePlyInput,
                                        { color: colors.text, backgroundColor: colors.inputBackground },
                                      ]}
                                      value={task.springs2ply}
                                      onChangeText={val => updateTask(machine.id, task.id, 'springs2ply', val)}
                                      keyboardType="number-pad"
                                      placeholder="0"
                                      placeholderTextColor={colors.textSecondary}
                                    />
                                  </View>
                                  <View style={styles.inlinePlyInputWrap}>
                                    <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>3P</Text>
                                    <TextInput
                                      style={[
                                        styles.inlinePlyInput,
                                        { color: colors.text, backgroundColor: colors.inputBackground },
                                      ]}
                                      value={task.springs3ply}
                                      onChangeText={val => updateTask(machine.id, task.id, 'springs3ply', val)}
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
                                onPress={() => setActiveTask({ machineId: machine.id, taskId: task.id })}
                              >
                                <View style={styles.summaryPlyRow}>
                                  <View style={styles.summaryPlyItem}>
                                    <Text style={[styles.summaryPlyLabel, { color: colors.textSecondary }]}>2P:</Text>
                                    <Text style={[styles.summaryPlyValue, { color: colors.text }]}>
                                      {task.springs2ply || 0}
                                    </Text>
                                  </View>
                                  <View style={styles.summaryPlyItem}>
                                    <Text style={[styles.summaryPlyLabel, { color: colors.textSecondary }]}>3P:</Text>
                                    <Text style={[styles.summaryPlyValue, { color: colors.text }]}>
                                      {task.springs3ply || 0}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.summaryTotalText, { color: colors.primary }]}>
                                  Total: {(parseInt(task.springs2ply) || 0) + (parseInt(task.springs3ply) || 0)}
                                </Text>
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

              <TouchableOpacity
                style={[styles.gridAddRowButton, { borderColor: colors.primary }]}
                onPress={addRow}
              >
                <Text style={[styles.gridAddRowText, { color: colors.primary }]}>+ Add New Row</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.headerBackground, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
            onPress={validateAndSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save All Tasks'}</Text>
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
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateInputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 120,
  },
  dateInput: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  verticalScrollView: {
    flex: 1,
  },
  verticalScrollContent: {
    flexGrow: 1,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowNumberCell: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  machineInfoCard: {
    width: 180,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  machineNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#fff',
  },
  machineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineWeightText: {
    fontSize: 12,
    fontWeight: '600',
  },
  machineCountText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gridCell: {
    width: 180,
    minHeight: 120,
    marginHorizontal: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  activeGridCell: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  filledGridCell: {},
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  cellShadeText: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  filledText: {
    fontWeight: '800',
  },
  editIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  emptyCellText: {
    textAlign: 'center',
    marginTop: 10,
  },
  cellSummary: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryPlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryPlyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPlyLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  summaryPlyValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryTotalText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 4,
  },
  inlineEditor: {
    flex: 1,
  },
  inlineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineShadeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
    borderBottomWidth: 2,
  },
  closeEditorBtn: {
    padding: 4,
    marginLeft: 8,
  },
  inlineDropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  inlineDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  inlineDropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlinePlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  inlinePlyInputWrap: {
    flex: 0.48,
  },
  inlinePlyLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  inlinePlyInput: {
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridAddRowButton: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  gridAddRowText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});