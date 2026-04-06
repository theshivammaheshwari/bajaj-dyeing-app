import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBackendBaseUrl } from '../lib/api-base';
import { useTheme } from '../context/ThemeContext';

const EXPO_PUBLIC_BACKEND_URL = getBackendBaseUrl();
const MACHINE_WEIGHTS = [6, 10.5, 12, 24];

interface DyeItem {
  dye_name: string;
  quantity: number;
}

interface Shade {
  id: string;
  shade_number: string;
  original_weight: number;
  program_number: string;
  rc: string;
  dyes: DyeItem[];
}

interface ScaledDye {
  dye_name: string;
  quantity: number;
}

export default function Calculator() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shadeId = params.shadeId as string;
  const { colors } = useTheme();

  const [shade, setShade] = useState<Shade | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<number>(6);
  const [allMachinesData, setAllMachinesData] = useState<{
    [key: string]: ScaledDye[];
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shadeId) {
      fetchShade();
      calculateAllMachines();
    }
  }, [shadeId]);

  const fetchShade = async () => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/shades/${shadeId}`
      );
      const data = await response.json();
      setShade(data);
    } catch (error) {
      console.error('Error fetching shade:', error);
      Alert.alert('Error', 'Failed to load shade');
    } finally {
      setLoading(false);
    }
  };

  const calculateAllMachines = async () => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/calculate-all-machines?shade_id=${shadeId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      setAllMachinesData(data.machines);
    } catch (error) {
      console.error('Error calculating recipes:', error);
    }
  };

  const calculatePerKg = (quantity: number) => {
    if (!shade) return 0;
    return quantity / shade.original_weight;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shade) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Shade not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recipe Calculator</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shade Info */}
        <View style={[styles.shadeInfoCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.shadeHeader}>
            <Text style={[styles.shadeNumber, { color: colors.primary }]}>Shade #{shade.shade_number}</Text>
            <View style={styles.programBadge}>
              <Text style={styles.programText}>{shade.program_number || 'P1'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Original Weight:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{shade.original_weight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Number of Dyes:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{shade.dyes.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>RC (Reduction Clearing):</Text>
            <Text style={[styles.infoValue, { color: colors.text }, shade.rc === 'Yes' && styles.rcYes]}>
              {shade.rc || 'No'}
            </Text>
          </View>
        </View>

        {/* Original Recipe */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Original Recipe ({shade.original_weight} kg)
          </Text>
          {shade.dyes.map((dye, index) => (
            <View key={index} style={[styles.dyeRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[styles.dyeName, { color: colors.text }]}>{dye.dye_name}</Text>
              <View style={styles.dyeQuantities}>
                <Text style={[styles.dyeQuantity, { color: colors.primary }]}>{dye.quantity.toFixed(2)} gm</Text>
                <Text style={[styles.dyePerKg, { color: colors.textSecondary }]}>
                  ({calculatePerKg(dye.quantity).toFixed(2)} gm/kg)
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Machine Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Machine</Text>
          <View style={styles.machineButtons}>
            {MACHINE_WEIGHTS.map((weight) => (
              <TouchableOpacity
                key={weight}
                style={[
                  styles.machineButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  selectedMachine === weight && [styles.machineButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                ]}
                onPress={() => setSelectedMachine(weight)}
              >
                <Text
                  style={[
                    styles.machineButtonText,
                    { color: colors.textSecondary },
                    selectedMachine === weight && [styles.machineButtonTextActive, { color: '#fff' }],
                  ]}
                >
                  {weight} kg
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scaled Recipe for Selected Machine */}
        {allMachinesData[selectedMachine] && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Scaled Recipe for {selectedMachine} kg Machine
            </Text>
            {allMachinesData[selectedMachine].map((dye, index) => (
              <View key={index} style={[styles.scaledDyeRow, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.scaledDyeName, { color: colors.text }]}>{dye.dye_name}</Text>
                <Text style={[styles.scaledDyeQuantity, { color: colors.primary }]}>
                  {dye.quantity.toFixed(2)} gm
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* All Machines Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Machines Comparison</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              {/* Table Header */}
              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.tableCell, styles.headerCell, styles.dyeNameCell, { backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.headerText, { color: colors.text }]}>Dye Name</Text>
                </View>
                {MACHINE_WEIGHTS.map((weight) => (
                  <View
                    key={weight}
                    style={[styles.tableCell, styles.headerCell, styles.machineCell, { backgroundColor: colors.inputBackground }]}
                  >
                    <Text style={[styles.headerText, { color: colors.text }]}>{weight} kg</Text>
                  </View>
                ))}
              </View>

              {/* Table Rows */}
              {shade.dyes.map((dye, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.tableCell, styles.dyeNameCell]}>
                    <Text style={[styles.tableCellText, { color: colors.text }]}>{dye.dye_name}</Text>
                  </View>
                  {MACHINE_WEIGHTS.map((weight) => {
                    const scaledDye = allMachinesData[weight]?.find(
                      (d) => d.dye_name === dye.dye_name
                    );
                    return (
                      <View
                        key={weight}
                        style={[
                          styles.tableCell,
                          styles.machineCell,
                          selectedMachine === weight && [styles.selectedCell, { backgroundColor: colors.primary }],
                        ]}
                      >
                        <Text
                          style={[
                            styles.tableCellText,
                            { color: colors.text },
                            selectedMachine === weight && [styles.selectedCellText, { color: '#fff' }],
                          ]}
                        >
                          {scaledDye?.quantity.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  shadeInfoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  shadeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shadeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  programBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  programText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  rcYes: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  dyeRow: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dyeName: {
    fontSize: 16,
    flex: 1,
  },
  dyeQuantities: {
    alignItems: 'flex-end',
  },
  dyeQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  dyePerKg: {
    fontSize: 12,
    marginTop: 4,
  },
  machineButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  machineButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  machineButtonActive: {
  },
  machineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  machineButtonTextActive: {
  },
  scaledDyeRow: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  scaledDyeName: {
    fontSize: 16,
    flex: 1,
  },
  scaledDyeQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
  },
  dyeNameCell: {
    width: 140,
    alignItems: 'flex-start',
  },
  machineCell: {
    width: 80,
  },
  selectedCell: {
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableCellText: {
    fontSize: 14,
  },
  selectedCellText: {
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
