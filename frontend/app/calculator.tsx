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

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shade) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Shade not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Calculator</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shade Info */}
        <View style={styles.shadeInfoCard}>
          <View style={styles.shadeHeader}>
            <Text style={styles.shadeNumber}>Shade #{shade.shade_number}</Text>
            <View style={styles.programBadge}>
              <Text style={styles.programText}>{shade.program_number || 'P1'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Original Weight:</Text>
            <Text style={styles.infoValue}>{shade.original_weight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Number of Dyes:</Text>
            <Text style={styles.infoValue}>{shade.dyes.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>RC (Reduction Clearing):</Text>
            <Text style={[styles.infoValue, shade.rc === 'Yes' && styles.rcYes]}>
              {shade.rc || 'No'}
            </Text>
          </View>
        </View>

        {/* Original Recipe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Original Recipe ({shade.original_weight} kg)
          </Text>
          {shade.dyes.map((dye, index) => (
            <View key={index} style={styles.dyeRow}>
              <Text style={styles.dyeName}>{dye.dye_name}</Text>
              <View style={styles.dyeQuantities}>
                <Text style={styles.dyeQuantity}>{dye.quantity.toFixed(2)} gm</Text>
                <Text style={styles.dyePerKg}>
                  ({calculatePerKg(dye.quantity).toFixed(2)} gm/kg)
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Machine Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Machine</Text>
          <View style={styles.machineButtons}>
            {MACHINE_WEIGHTS.map((weight) => (
              <TouchableOpacity
                key={weight}
                style={[
                  styles.machineButton,
                  selectedMachine === weight && styles.machineButtonActive,
                ]}
                onPress={() => setSelectedMachine(weight)}
              >
                <Text
                  style={[
                    styles.machineButtonText,
                    selectedMachine === weight && styles.machineButtonTextActive,
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
            <Text style={styles.sectionTitle}>
              Scaled Recipe for {selectedMachine} kg Machine
            </Text>
            {allMachinesData[selectedMachine].map((dye, index) => (
              <View key={index} style={styles.scaledDyeRow}>
                <Text style={styles.scaledDyeName}>{dye.dye_name}</Text>
                <Text style={styles.scaledDyeQuantity}>
                  {dye.quantity.toFixed(2)} gm
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* All Machines Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Machines Comparison</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <View style={[styles.tableCell, styles.headerCell, styles.dyeNameCell]}>
                  <Text style={styles.headerText}>Dye Name</Text>
                </View>
                {MACHINE_WEIGHTS.map((weight) => (
                  <View
                    key={weight}
                    style={[styles.tableCell, styles.headerCell, styles.machineCell]}
                  >
                    <Text style={styles.headerText}>{weight} kg</Text>
                  </View>
                ))}
              </View>

              {/* Table Rows */}
              {shade.dyes.map((dye, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.dyeNameCell]}>
                    <Text style={styles.tableCellText}>{dye.dye_name}</Text>
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
                          selectedMachine === weight && styles.selectedCell,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tableCellText,
                            selectedMachine === weight && styles.selectedCellText,
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
    backgroundColor: '#0f0f1e',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    paddingTop: 8,
  },
  backLink: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  },
  shadeInfoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
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
    color: '#4CAF50',
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
    color: '#aaa',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
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
    color: '#fff',
    marginBottom: 16,
  },
  dyeRow: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dyeName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  dyeQuantities: {
    alignItems: 'flex-end',
  },
  dyeQuantity: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  dyePerKg: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  machineButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  machineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  machineButtonTextActive: {
    color: '#fff',
  },
  scaledDyeRow: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  scaledDyeName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  scaledDyeQuantity: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  table: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tableCell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    backgroundColor: '#2a2a3e',
  },
  dyeNameCell: {
    width: 140,
    alignItems: 'flex-start',
  },
  machineCell: {
    width: 80,
  },
  selectedCell: {
    backgroundColor: '#4CAF50',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableCellText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCellText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
