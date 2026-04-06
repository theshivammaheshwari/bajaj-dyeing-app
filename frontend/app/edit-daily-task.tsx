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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  error?: string;
}

const emptyTask = (machineId: string, index: number): MachineTaskData => ({
  id: `${machineId}-${index}`,
  shadeId: '',
  shadeNumber: '',
  springs2ply: '',
  springs3ply: '',
  showShadeDropdown: false,
  shadeSearchText: '',
  error: '',
});

export default function EditDailyTask() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams(); 
  const { colors, theme } = useTheme();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<{ machineId: string; taskId: string } | null>(null);
  const [saveError, setSaveError] = useState('');
  
  const [machineTasks, setMachineTasks] = useState<{ [key: string]: MachineTaskData[] }>({
    m1: Array.from({ length: 5 }, (_, i) => emptyTask('m1', i)),
    m2: Array.from({ length: 5 }, (_, i) => emptyTask('m2', i)),
    m3: Array.from({ length: 5 }, (_, i) => emptyTask('m3', i)),
    m4: Array.from({ length: 5 }, (_, i) => emptyTask('m4', i)),
    m5: Array.from({ length: 5 }, (_, i) => emptyTask('m5', i)),
  });

  const maxRows = Math.max(...Object.values(machineTasks).map(tasks => tasks.length), 5);

  useEffect(() => {
    fetchShades();
    if (taskId) {
      fetchExistingTask();
    }
  }, [taskId]);

  const fetchExistingTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks`);
      const allTasks = await response.json();
      const data = allTasks.find((t: any) => t.id === taskId);

      if (data) {
        setDate(data.date);
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
            error: '',
          }));
          while (newMachineTasks[m.id].length < 5) {
            newMachineTasks[m.id].push(emptyTask(m.id, newMachineTasks[m.id].length));
          }
        });
        setMachineTasks(newMachineTasks);
      }
    } catch (error) {
      setSaveError('Could not load existing task data');
    } finally {
      setLoading(false);
    }
  };

  const fetchShades = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades`);
      const data = await response.json();
      setShades(data.sort((a: Shade, b: Shade) => (parseInt(a.shade_number) || 0) - (parseInt(b.shade_number) || 0)));
    } catch (error) {
      console.error('Error fetching shades:', error);
    }
  };

  const updateTask = (machineId: string, taskId: string, field: string, value: string | boolean) => {
    const machine = MACHINES.find(m => m.id === machineId);
    const max = machine?.totalSprings || 0;

    setMachineTasks(prev => ({
      ...prev,
      [machineId]: prev[machineId].map(task => {
        if (task.id !== taskId) return task;
        if (field === 'shadeId') {
          const selectedShade = shades.find(s => s.id === value);
          return { ...task, shadeId: value as string, shadeNumber: selectedShade?.shade_number || '', shadeSearchText: selectedShade?.shade_number || '', showShadeDropdown: false };
        }
        if (field === 'springs2ply' || field === 'springs3ply') {
          const numVal = parseInt(value as string) || 0;
          let error = '';

          if (numVal < 0) {
            error = 'Cannot be negative';
          } else if (numVal > max) {
            error = `Exceeds capacity (${max})`;
          }

          if (error) {
            return { ...task, [field]: value, error };
          }

          const otherField = field === 'springs2ply' ? 'springs3ply' : 'springs2ply';
          const otherVal = Math.max(0, max - numVal).toString();
          return { ...task, [field]: value, [otherField]: otherVal, error: '' };
        }
        return { ...task, [field]: value };
      })
    }));
  };

  const getFilteredShades = (text: string) => {
    if (!text || text.trim() === '') return shades;
    return shades.filter(s => s.shade_number.toString().toLowerCase().includes(text.toLowerCase()));
  };

  const addRow = () => {
    setMachineTasks(prev => {
      const next = { ...prev };
      MACHINES.forEach(m => {
        next[m.id] = [...next[m.id], emptyTask(m.id, next[m.id].length)];
      });
      return next;
    });
  };

  const deleteRow = (rowIndex: number) => {
    const doDelete = () => {
      setMachineTasks(prev => {
        const updated = { ...prev };
        MACHINES.forEach(machine => {
          updated[machine.id] = prev[machine.id].filter((_, idx) => idx !== rowIndex);
        });
        // Ensure at least 1 row remains
        const hasRows = updated[MACHINES[0].id].length > 0;
        if (!hasRows) {
          MACHINES.forEach(machine => {
            updated[machine.id] = [emptyTask(machine.id, 0)];
          });
        }
        return updated;
      });
      setActiveTask(null);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete Task ${rowIndex + 1}?`);
      if (confirmed) doDelete();
    } else {
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete Task ${rowIndex + 1}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const validateAndSave = async () => {
    setSaveError('');

    // Check for per-task capacity errors
    for (const machine of MACHINES) {
      const tasks = machineTasks[machine.id];
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (task.shadeId && (task.springs2ply || task.springs3ply)) {
          const ply2 = parseInt(task.springs2ply) || 0;
          const ply3 = parseInt(task.springs3ply) || 0;
          const total = ply2 + ply3;
          if (total > machine.totalSprings) {
            setSaveError(`${machine.name} Task ${i + 1}: Total (${total}) exceeds capacity (${machine.totalSprings})`);
            return;
          }
          if (ply2 < 0 || ply3 < 0) {
            setSaveError(`${machine.name} Task ${i + 1}: Values cannot be negative`);
            return;
          }
        }
      }
    }

    const payload: any = { date };
    let hasData = false;
    for (const machine of MACHINES) {
      const tasks = machineTasks[machine.id].filter(t => t.shadeId !== '');
      if (tasks.length > 0) {
        payload[machine.id] = tasks.map(t => ({
          shade_id: t.shadeId, shade_number: t.shadeNumber,
          springs_2ply: parseInt(t.springs2ply) || 0,
          springs_3ply: parseInt(t.springs3ply) || 0,
          weight: machine.capacity,
        }));
        hasData = true;
      } else { payload[machine.id] = []; }
    }
    if (!hasData) {
      setSaveError('No tasks added');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/${taskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Updated successfully!');
          router.back();
        } else {
          Alert.alert('Success', 'Updated!', [{ text: 'OK', onPress: () => router.back() }]);
        }
      } else {
        const err = await response.json();
        setSaveError(`Update failed: ${err.detail || 'Unknown error'}`);
      }
    } catch (e) {
      setSaveError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}><Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Task</Text>
          <View style={[styles.dateInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <TextInput style={[styles.dateInput, { color: colors.primary }]} value={date} editable={false} />
          </View>
        </View>
        <ScrollView
          style={styles.verticalScrollView}
          contentContainerStyle={styles.verticalScrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            horizontal
            style={styles.horizontalScrollView}
            contentContainerStyle={styles.horizontalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <View style={styles.rowNumberCell}><Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>#</Text></View>
                {MACHINES.map(m => (
                  <View key={m.id} style={[styles.machineInfoCard, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.machineNameText, { color: '#fff' }]}>{m.name}</Text>
                    <Text style={[styles.machineCountText, { color: '#fff' }]}>
                      Cap: {m.totalSprings}
                    </Text>
                  </View>
                ))}
              </View>
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <View key={rowIndex} style={[styles.gridRow, { zIndex: maxRows - rowIndex }]}>
                  <View style={styles.rowNumberCell}>
                    <Text style={[styles.rowNumberText, { color: colors.textSecondary }]}>{rowIndex + 1}</Text>
                    <TouchableOpacity
                      style={styles.deleteRowBtn}
                      onPress={() => deleteRow(rowIndex)}
                    >
                      <Text style={styles.deleteRowIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  {MACHINES.map(m => {
                    const t = machineTasks[m.id][rowIndex];
                    const isActive = activeTask?.machineId === m.id && activeTask?.taskId === t?.id;
                    const hasError = !!(t?.error);
                    return (
                      <View key={m.id} style={[
                        styles.gridCell, 
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isActive && [styles.activeGridCell, { borderColor: colors.primary, borderWidth: 2 }], 
                        t?.shadeId && [styles.filledGridCell, { backgroundColor: theme === 'dark' ? '#1a2e1a' : '#e8f5e9' }],
                        hasError && { borderColor: '#ef4444', borderWidth: 2 },
                        { zIndex: isActive ? 1000 : 1 }
                      ]}>
                        {t && (
                          <>
                            <TouchableOpacity onPress={() => setActiveTask(isActive ? null : { machineId: m.id, taskId: t.id })}>
                              <Text style={[styles.cellShadeText, { color: colors.textSecondary }, t.shadeNumber && [styles.filledText, { color: colors.primary }]]}>{t.shadeNumber ? `#${t.shadeNumber}` : 'Shade'}</Text>
                            </TouchableOpacity>
                            {isActive ? (
                              <View style={styles.inlineEditor}>
                                <View style={styles.inlineHeaderActions}>
                                  <TextInput style={[styles.inlineShadeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]} value={t.shadeSearchText} placeholder="Shade..." placeholderTextColor={colors.textSecondary}
                                    onChangeText={v => { updateTask(m.id, t.id, 'shadeSearchText', v); updateTask(m.id, t.id, 'showShadeDropdown', true); }}
                                    onFocus={() => updateTask(m.id, t.id, 'showShadeDropdown', true)} keyboardType="number-pad" autoFocus />
                                  <TouchableOpacity
                                    onPress={() => setActiveTask(null)}
                                    style={styles.closeEditorBtn}
                                  >
                                    <Text style={{ color: colors.danger, fontWeight: 'bold' }}>✕</Text>
                                  </TouchableOpacity>
                                </View>
                                {t.showShadeDropdown && (
                                  <View style={[styles.inlineDropdown, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 250 }}>
                                      {getFilteredShades(t.shadeSearchText).map(s => (
                                        <TouchableOpacity key={s.id} style={[styles.inlineDropdownItem, { borderBottomColor: colors.border }]} onPress={() => updateTask(m.id, t.id, 'shadeId', s.id)}>
                                          <Text style={[styles.inlineDropdownText, { color: colors.text }]}>#{s.shade_number}</Text>
                                        </TouchableOpacity>
                                      ))}
                                      {getFilteredShades(t.shadeSearchText).length === 0 && (
                                        <View style={[styles.inlineDropdownItem, { borderBottomColor: colors.border }]}><Text style={[styles.inlineDropdownText, { color: colors.textSecondary }]}>No shades found</Text></View>
                                      )}
                                    </ScrollView>
                                  </View>
                                )}
                                <View style={styles.inlinePlyRow}>
                                  <View style={styles.inlinePlyInputWrap}>
                                    <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>2P</Text>
                                    <TextInput style={[styles.inlinePlyInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }, hasError && { borderColor: '#ef4444', borderWidth: 1 }]} value={t.springs2ply} onChangeText={v => updateTask(m.id, t.id, 'springs2ply', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textSecondary} />
                                  </View>
                                  <View style={styles.inlinePlyInputWrap}>
                                    <Text style={[styles.inlinePlyLabel, { color: colors.textSecondary }]}>3P</Text>
                                    <TextInput style={[styles.inlinePlyInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }, hasError && { borderColor: '#ef4444', borderWidth: 1 }]} value={t.springs3ply} onChangeText={v => updateTask(m.id, t.id, 'springs3ply', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textSecondary} />
                                  </View>
                                </View>
                                {hasError && (
                                  <Text style={styles.cellErrorText}>⚠ {t.error}</Text>
                                )}
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.cellSummary} onPress={() => setActiveTask({ machineId: m.id, taskId: t.id })}>
                                <Text style={[styles.summaryPlyText, { color: colors.textSecondary }]}>{t.springs2ply || 0}P + {t.springs3ply || 0}P</Text>
                                <Text style={[styles.summaryTotalText, { color: colors.primary }]}>
                                  Total: {(parseInt(t.springs2ply) || 0) + (parseInt(t.springs3ply) || 0)}/{m.totalSprings}
                                </Text>
                                {hasError && (
                                  <Text style={styles.cellErrorText}>⚠ {t.error}</Text>
                                )}
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
              <TouchableOpacity style={[styles.gridAddRowButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={addRow}><Text style={[styles.gridAddRowText, { color: colors.primary }]}>+ Add Row</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </ScrollView>

        {saveError ? (
          <View style={styles.saveErrorContainer}>
            <Text style={styles.saveErrorText}>⚠ {saveError}</Text>
          </View>
        ) : null}

        <View style={[styles.footer, { backgroundColor: colors.headerBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]} onPress={validateAndSave} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? 'Updating...' : '✓ Update Task'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButtonText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  dateInputContainer: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12 },
  dateInput: { fontSize: 14, fontWeight: 'bold', paddingVertical: 4 },
  verticalScrollView: { flex: 1 },
  verticalScrollContent: { flexGrow: 1 },
  horizontalScrollView: { flex: 1 },
  horizontalScrollContent: { flexGrow: 1 },
  gridContainer: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 20 },
  gridRow: { flexDirection: 'row', marginBottom: 8 },
  rowNumberCell: { width: 40, justifyContent: 'center', alignItems: 'center' },
  rowNumberText: { fontSize: 12 },
  deleteRowBtn: { marginTop: 4, padding: 2 },
  deleteRowIcon: { fontSize: 14 },
  machineInfoCard: { width: 90, height: 70, borderRadius: 12, marginHorizontal: 4, padding: 8, justifyContent: 'center', alignItems: 'center' },
  machineNameText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  machineCountText: { color: '#fff', fontSize: 12 },
  gridCell: { width: 90, minHeight: 110, borderRadius: 12, marginHorizontal: 4, padding: 6, borderWidth: 1, justifyContent: 'center' },
  activeGridCell: { },
  filledGridCell: { },
  cellShadeText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  filledText: { },
  inlineEditor: { marginTop: 2 },
  inlineHeaderActions: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inlineShadeInput: { flex: 1, borderRadius: 6, padding: 6, fontSize: 13, borderWidth: 1, textAlign: 'center' },
  closeEditorBtn: { padding: 4, marginLeft: 4 },
  inlineDropdown: { position: 'absolute', top: 35, left: -4, right: -4, borderRadius: 8, maxHeight: 250, zIndex: 10000, borderWidth: 2, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  inlineDropdownItem: { padding: 12, borderBottomWidth: 1 },
  inlineDropdownText: { fontSize: 14, textAlign: 'center', fontWeight: '600' },
  inlinePlyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 4 },
  inlinePlyInputWrap: { flex: 1 },
  inlinePlyLabel: { fontSize: 9, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  inlinePlyInput: { borderRadius: 6, flex: 1, padding: 4, fontSize: 11, textAlign: 'center', borderWidth: 1 },
  cellSummary: { flex: 1, justifyContent: 'center' },
  summaryPlyText: { fontSize: 11, textAlign: 'center' },
  summaryTotalText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
  cellErrorText: { color: '#ef4444', fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  gridAddRowButton: { width: 470, height: 40, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, marginTop: 16, marginHorizontal: 34, justifyContent: 'center', alignItems: 'center' },
  gridAddRowText: { fontSize: 13 },
  saveErrorContainer: { backgroundColor: '#fef2f2', borderTopWidth: 1, borderTopColor: '#fecaca', paddingVertical: 10, paddingHorizontal: 16 },
  saveErrorText: { color: '#dc2626', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  footer: { padding: 16, borderTopWidth: 1 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  saveButtonDisabled: { opacity: 0.5 },
});
