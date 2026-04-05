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

export default function EditDailyTask() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<{ machineId: string; taskId: string } | null>(null);
  
  const [machineTasks, setMachineTasks] = useState<{ [key: string]: MachineTaskData[] }>({
    m1: Array.from({ length: 5 }, (_, i) => ({ id: \`m1-\${i}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m2: Array.from({ length: 5 }, (_, i) => ({ id: \`m2-\${i}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m3: Array.from({ length: 5 }, (_, i) => ({ id: \`m3-\${i}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m4: Array.from({ length: 5 }, (_, i) => ({ id: \`m4-\${i}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
    m5: Array.from({ length: 5 }, (_, i) => ({ id: \`m5-\${i}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' })),
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
      const response = await fetch(\`\${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/id/\${taskId}\`);
      const data = await response.json();
      if (data) {
        setDate(data.date);
        const newMachineTasks: { [key: string]: MachineTaskData[] } = {};
        MACHINES.forEach(m => {
          const apiTasks = data[m.id] || [];
          newMachineTasks[m.id] = apiTasks.map((t: any, idx: number) => ({
            id: \`\${m.id}-\${idx}\`,
            shadeId: t.shade_id,
            shadeNumber: t.shade_number,
            springs2ply: t.springs_2ply.toString(),
            springs3ply: t.springs_3ply.toString(),
            showShadeDropdown: false,
            shadeSearchText: t.shade_number
          }));
          while (newMachineTasks[m.id].length < 5) {
            newMachineTasks[m.id].push({
              id: \`\${m.id}-\${newMachineTasks[m.id].length}\`,
              shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: ''
            });
          }
        });
        setMachineTasks(newMachineTasks);
      }
    } catch (error) {
      console.error('Error fetching existing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShades = async () => {
    try {
      const response = await fetch(\`\${EXPO_PUBLIC_BACKEND_URL}/api/shades\`);
      const data = await response.json();
      const sortedShades = data.sort((a: Shade, b: Shade) => (parseInt(a.shade_number) || 0) - (parseInt(b.shade_number) || 0));
      setShades(sortedShades);
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
          const otherField = field === 'springs2ply' ? 'springs3ply' : 'springs2ply';
          const otherVal = Math.max(0, max - numVal).toString();
          return { ...task, [field]: value, [otherField]: otherVal };
        }
        return { ...task, [field]: value };
      })
    }));
  };

  const getFilteredShades = (text: string) => {
    if (!text) return shades.slice(0, 10);
    return shades.filter(s => s.shade_number.toString().includes(text));
  };

  const addRow = () => {
    setMachineTasks(prev => {
      const next = { ...prev };
      MACHINES.forEach(m => {
        next[m.id] = [...next[m.id], { id: \`\${m.id}-\${next[m.id].length}\`, shadeId: '', shadeNumber: '', springs2ply: '', springs3ply: '', showShadeDropdown: false, shadeSearchText: '' }];
      });
      return next;
    });
  };

  const validateAndSave = async () => {
    const payload: any = { date };
    let hasData = false;

    for (const machine of MACHINES) {
      const tasks = machineTasks[machine.id].filter(t => t.shadeId && (t.springs2ply || t.springs3ply));
      const totalSprings = tasks.reduce((sum, t) => sum + (parseInt(t.springs2ply) || 0) + (parseInt(t.springs3ply) || 0), 0);
      
      if (totalSprings > machine.totalSprings) {
        Alert.alert('Error', \`\${machine.name} exceeds capacity!\`);
        return;
      }
      if (tasks.length > 0) {
        payload[machine.id] = tasks.map(t => ({
          shade_id: t.shadeId, shade_number: t.shadeNumber,
          springs_2ply: parseInt(t.springs2ply) || 0,
          springs_3ply: parseInt(t.springs3ply) || 0,
          weight: machine.capacity,
        }));
        hasData = true;
      }
    }

    if (!hasData) return Alert.alert('Error', 'No tasks added');

    setLoading(true);
    try {
      const method = taskId ? 'PUT' : 'POST';
      const url = taskId ? \`\${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks/\${taskId}\` : \`\${EXPO_PUBLIC_BACKEND_URL}/api/daily-tasks\`;
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) Alert.alert('Success', 'Updated!', () => router.back());
    } catch (e) { Alert.alert('Error', 'Failed'); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1e" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backButtonText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Task</Text>
          <View style={styles.dateInputContainer}>
            <TextInput style={styles.dateInput} value={date} onChangeText={setDate} />
          </View>
        </View>

        <ScrollView horizontal style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View>
            <View style={styles.gridRow}>
              <View style={styles.rowNumberCell}><Text style={styles.rowNumberText}>#</Text></View>
              {MACHINES.map(m => (
                <View key={m.id} style={styles.machineInfoCard}>
                  <Text style={styles.machineNameText}>{m.name}</Text>
                  <Text style={styles.machineCountText}>
                    {machineTasks[m.id].reduce((s, t) => s + (parseInt(t.springs2ply) || 0) + (parseInt(t.springs3ply) || 0), 0)}/{m.totalSprings}
                  </Text>
                </View>
              ))}
            </View>

            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                <View style={styles.rowNumberCell}><Text style={styles.rowNumberText}>{rowIndex + 1}</Text></View>
                {MACHINES.map(m => {
                  const t = machineTasks[m.id][rowIndex];
                  const isActive = activeTask?.machineId === m.id && activeTask?.taskId === t?.id;
                  return (
                    <View key={m.id} style={[styles.gridCell, isActive && styles.activeGridCell, t?.shadeId && styles.filledGridCell]}>
                      {t && (
                        <>
                          <TouchableOpacity onPress={() => setActiveTask(isActive ? null : { machineId: m.id, taskId: t.id })}>
                            <Text style={[styles.cellShadeText, t.shadeNumber && styles.filledText]}>{t.shadeNumber ? \`#\${t.shadeNumber}\` : 'Shade'}</Text>
                          </TouchableOpacity>
                          {isActive ? (
                            <View style={styles.inlineEditor}>
                              <TextInput style={styles.inlineShadeInput} value={t.shadeSearchText} placeholder="Shade..." placeholderTextColor="#444"
                                onChangeText={v => { updateTask(m.id, t.id, 'shadeSearchText', v); updateTask(m.id, t.id, 'showShadeDropdown', true); }}
                                onFocus={() => updateTask(m.id, t.id, 'showShadeDropdown', true)} keyboardType="number-pad" autoFocus />
                              {t.showShadeDropdown && (
                                <View style={styles.inlineDropdown}>
                                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {getFilteredShades(t.shadeSearchText).map(s => (
                                      <TouchableOpacity key={s.id} style={styles.inlineDropdownItem} onPress={() => updateTask(m.id, t.id, 'shadeId', s.id)}>
                                        <Text style={styles.inlineDropdownText}>#\${s.shade_number}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                              <View style={styles.inlinePlyRow}>
                                <TextInput style={styles.inlinePlyInput} value={t.springs2ply} onChangeText={v => updateTask(m.id, t.id, 'springs2ply', v)} keyboardType="number-pad" placeholder="2P" placeholderTextColor="#444" />
                                <TextInput style={styles.inlinePlyInput} value={t.springs3ply} onChangeText={v => updateTask(m.id, t.id, 'springs3ply', v)} keyboardType="number-pad" placeholder="3P" placeholderTextColor="#444" />
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.cellSummary} onPress={() => setActiveTask({ machineId: m.id, taskId: t.id })}>
                              <Text style={styles.summaryPlyText}>{t.springs2ply || 0}P + {t.springs3ply || 0}P</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
            <TouchableOpacity style={styles.gridAddRowButton} onPress={addRow}><Text style={styles.gridAddRowText}>+ Add Row</Text></TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={validateAndSave} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? 'Updating...' : '✓ Update Task'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1 },
  dateInputContainer: { backgroundColor: '#1a1a2e', borderRadius: 8, borderWidth: 1, borderColor: '#333', paddingHorizontal: 12 },
  dateInput: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', paddingVertical: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12 },
  gridRow: { flexDirection: 'row', marginBottom: 8 },
  rowNumberCell: { width: 30, justifyContent: 'center' },
  rowNumberText: { color: '#555', fontSize: 12 },
  machineInfoCard: { width: 90, height: 70, backgroundColor: '#4CAF50', borderRadius: 12, marginHorizontal: 4, padding: 8, justifyContent: 'center', alignItems: 'center' },
  machineNameText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  machineCountText: { color: '#fff', fontSize: 12 },
  gridCell: { width: 90, minHeight: 110, backgroundColor: '#1a1a2e', borderRadius: 12, marginHorizontal: 4, padding: 6, borderWidth: 1, borderColor: '#2a2a3e', justifyContent: 'center' },
  activeGridCell: { borderColor: '#4CAF50', backgroundColor: '#1e1e30', zIndex: 10 },
  filledGridCell: { borderColor: '#2e7d32' },
  cellShadeText: { color: '#666', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  filledText: { color: '#4CAF50' },
  inlineEditor: { marginTop: 2 },
  inlineShadeInput: { backgroundColor: '#0f0f1e', borderRadius: 6, padding: 6, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: '#333', textAlign: 'center' },
  inlineDropdown: { position: 'absolute', top: 35, left: 0, right: 0, backgroundColor: '#2a2a3e', borderRadius: 8, maxHeight: 200, zIndex: 1000, borderWidth: 2, borderColor: '#4CAF50' },
  inlineDropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#3a3a4e' },
  inlineDropdownText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  inlinePlyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 4 },
  inlinePlyInput: { backgroundColor: '#0f0f1e', borderRadius: 6, flex: 1, padding: 4, color: '#fff', fontSize: 11, textAlign: 'center', borderWidth: 1, borderColor: '#333' },
  cellSummary: { flex: 1, justifyContent: 'center' },
  summaryPlyText: { color: '#888', fontSize: 11, textAlign: 'center' },
  gridAddRowButton: { width: 470, height: 40, borderWidth: 1, borderColor: '#4CAF50', borderStyle: 'dashed', borderRadius: 12, marginTop: 16, marginHorizontal: 34, justifyContent: 'center', alignItems: 'center' },
  gridAddRowText: { color: '#4CAF50', fontSize: 13 },
  footer: { padding: 16, backgroundColor: '#0f0f1e' },
  saveButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  saveButtonDisabled: { opacity: 0.5 },
});
