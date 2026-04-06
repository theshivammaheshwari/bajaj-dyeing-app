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

interface DyeInput {
  id: string;
  dye_name: string;
  quantity: string;
}

export default function AddShade() {
  const router = useRouter();
  const [shadeNumber, setShadeNumber] = useState('');
  const [originalWeight, setOriginalWeight] = useState('');
  const [programNumber, setProgramNumber] = useState('P1');
  const [rcValue, setRcValue] = useState('No');
  const [dyes, setDyes] = useState<DyeInput[]>([
    { id: '1', dye_name: '', quantity: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [allDyeNames, setAllDyeNames] = useState<string[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchDyeNames();
  }, []);

  const fetchDyeNames = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/dye-names`);
      const data = await response.json();
      setAllDyeNames(data.dye_names || []);
    } catch (error) {
      console.error('Error fetching dye names:', error);
    }
  };

  const handleDyeNameChange = (id: string, value: string) => {
    updateDye(id, 'dye_name', value);
    
    if (value.trim().length > 0) {
      const filtered = allDyeNames.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setActiveSuggestionId(id);
    } else {
      setFilteredSuggestions([]);
      setActiveSuggestionId(null);
    }
  };

  const selectSuggestion = (id: string, suggestion: string) => {
    updateDye(id, 'dye_name', suggestion);
    setFilteredSuggestions([]);
    setActiveSuggestionId(null);
  };

  const addDyeField = () => {
    setDyes([...dyes, { id: Date.now().toString(), dye_name: '', quantity: '' }]);
  };

  const removeDyeField = (id: string) => {
    if (dyes.length > 1) {
      setDyes(dyes.filter((dye) => dye.id !== id));
    }
  };

  const updateDye = (id: string, field: 'dye_name' | 'quantity', value: string) => {
    setDyes(
      dyes.map((dye) => (dye.id === id ? { ...dye, [field]: value } : dye))
    );
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

  const validateForm = () => {
    if (!shadeNumber.trim()) {
      showAlert('Error', 'Please enter shade number');
      return false;
    }

    const weight = parseFloat(originalWeight);
    if (!originalWeight || isNaN(weight) || weight <= 0) {
      showAlert('Error', 'Please enter valid original weight');
      return false;
    }

    const validDyes = dyes.filter(
      (dye) => dye.dye_name.trim() && dye.quantity.trim()
    );

    if (validDyes.length === 0) {
      showAlert('Error', 'Please add at least one dye with name and quantity');
      return false;
    }

    for (const dye of validDyes) {
      const qty = parseFloat(dye.quantity);
      if (isNaN(qty) || qty <= 0) {
        showAlert('Error', `Invalid quantity for dye: ${dye.dye_name}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const validDyes = dyes
        .filter((dye) => dye.dye_name.trim() && dye.quantity.trim())
        .map((dye) => ({
          dye_name: dye.dye_name.trim(),
          quantity: parseFloat(dye.quantity),
        }));

      const payload = {
        shade_number: shadeNumber.trim(),
        original_weight: parseFloat(originalWeight),
        program_number: programNumber,
        rc: rcValue,
        dyes: validDyes,
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/shades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Clear form for new entry
        setShadeNumber('');
        setOriginalWeight('');
        setProgramNumber('P1');
        setRcValue('No');
        setDyes([{ id: '1', dye_name: '', quantity: '' }]);
        setFilteredSuggestions([]);
        setActiveSuggestionId(null);
        
        showAlert('Success', `Shade #${shadeNumber.trim()} saved! Add next shade.`);
      } else {
        const error = await response.json();
        showAlert('Error', error.detail || 'Failed to add shade');
      }
    } catch (error) {
      console.error('Error adding shade:', error);
      showAlert('Error', 'Failed to add shade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Shade</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shade Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shade Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 7"
                placeholderTextColor="#666"
                value={shadeNumber}
                onChangeText={setShadeNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Original Weight (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 6"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={originalWeight}
                onChangeText={setOriginalWeight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Machine Program *</Text>
              <View style={styles.programButtons}>
                {['P1', 'P2', 'P3'].map((program) => (
                  <TouchableOpacity
                    key={program}
                    style={[
                      styles.programButton,
                      programNumber === program && styles.programButtonActive,
                    ]}
                    onPress={() => setProgramNumber(program)}
                  >
                    <Text
                      style={[
                        styles.programButtonText,
                        programNumber === program && styles.programButtonTextActive,
                      ]}
                    >
                      {program}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>RC (Reduction Clearing) *</Text>
              <View style={styles.programButtons}>
                {['Yes', 'No'].map((rc) => (
                  <TouchableOpacity
                    key={rc}
                    style={[
                      styles.rcButton,
                      rcValue === rc && styles.rcButtonActive,
                    ]}
                    onPress={() => setRcValue(rc)}
                  >
                    <Text
                      style={[
                        styles.programButtonText,
                        rcValue === rc && styles.programButtonTextActive,
                      ]}
                    >
                      {rc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dye Colors</Text>
              <TouchableOpacity onPress={addDyeField} style={styles.addDyeButton}>
                <Text style={styles.addDyeButtonText}>+ Add Dye</Text>
              </TouchableOpacity>
            </View>

            {dyes.map((dye, index) => (
              <View key={dye.id} style={styles.dyeCard}>
                <View style={styles.dyeHeader}>
                  <Text style={styles.dyeNumber}>Dye {index + 1}</Text>
                  {dyes.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeDyeField(dye.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dye Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Yellow Brown"
                    placeholderTextColor="#666"
                    value={dye.dye_name}
                    onChangeText={(value) => handleDyeNameChange(dye.id, value)}
                    onFocus={() => {
                      if (dye.dye_name.trim().length > 0) {
                        const filtered = allDyeNames.filter(name =>
                          name.toLowerCase().includes(dye.dye_name.toLowerCase())
                        );
                        setFilteredSuggestions(filtered);
                        setActiveSuggestionId(dye.id);
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow tap on suggestion
                      setTimeout(() => {
                        if (activeSuggestionId === dye.id) {
                          setActiveSuggestionId(null);
                        }
                      }, 200);
                    }}
                  />
                  {activeSuggestionId === dye.id && filteredSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView 
                        style={styles.suggestionsList} 
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {filteredSuggestions.slice(0, 5).map((suggestion, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionItem}
                            onPress={() => selectSuggestion(dye.id, suggestion)}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Quantity (grams) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 41.93"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    value={dye.quantity}
                    onChangeText={(value) => updateDye(dye.id, 'quantity', value)}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Shade'}
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
    backgroundColor: '#1a1a2e',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionsContainer: {
    position: 'relative',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
    maxHeight: 150,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 15,
  },
  dyeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  dyeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dyeNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addDyeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDyeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  programButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  programButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  programButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  programButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  programButtonTextActive: {
    color: '#fff',
  },
  rcButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  rcButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
