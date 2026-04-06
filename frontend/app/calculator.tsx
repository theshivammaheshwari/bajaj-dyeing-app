import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

interface CartItem {
  id: string;
  shadeNumber: string;
  programNumber: string;
  weight: number;
  rc: string;
  originalWeight: number;
  dyes: ScaledDye[];
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const CART_STORAGE_KEY = 'bajaj_recipe_cart';

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    };
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  const saveCart = useCallback(async (updatedCart: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, []);

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

  const addToCart = () => {
    if (!shade || !allMachinesData[selectedMachine]) return;

    const cartItem: CartItem = {
      id: `${shade.id}-${selectedMachine}-${Date.now()}`,
      shadeNumber: shade.shade_number,
      programNumber: shade.program_number || 'P1',
      weight: selectedMachine,
      rc: shade.rc || 'No',
      originalWeight: shade.original_weight,
      dyes: allMachinesData[selectedMachine],
    };

    setCart(prev => {
      const newCart = [...prev, cartItem];
      saveCart(newCart);
      return newCart;
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.id !== id);
      saveCart(newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    const doClear = () => {
      setCart([]);
      saveCart([]);
    };
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Clear all items from cart?');
      if (confirmed) doClear();
    } else {
      Alert.alert('Clear Cart', 'Remove all items?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: doClear },
      ]);
    }
  };

  const handleBulkPrint = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Print', 'Bulk printing is only supported in the web version.');
      return;
    }

    // Build print HTML
    const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bajaj Dyeing - Recipe Cart Print</title>
  <style>
    @page {
      size: A1 landscape;
      margin: 20mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1B2A4A;
      background: #fff;
      padding: 24px;
    }
    .print-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2B6CB0;
      padding-bottom: 16px;
    }
    .print-header h1 {
      font-size: 36px;
      color: #2B6CB0;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .print-header p {
      font-size: 16px;
      color: #5A6B8A;
    }
    .recipes-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      justify-content: flex-start;
    }
    .recipe-card {
      border: 2px solid #C8D9EF;
      border-radius: 12px;
      padding: 20px;
      width: calc(50% - 12px);
      min-width: 400px;
      background: #FAFCFF;
      page-break-inside: avoid;
    }
    .recipe-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #E6F0FA;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .shade-title {
      font-size: 24px;
      font-weight: bold;
      color: #2B6CB0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      color: #fff;
      margin-left: 8px;
    }
    .badge-weight {
      background: #2B6CB0;
    }
    .badge-program {
      background: #FF9800;
    }
    .badge-rc {
      background: #805AD5;
    }
    .recipe-info {
      display: flex;
      gap: 20px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #5A6B8A;
    }
    .recipe-info span {
      font-weight: 600;
      color: #1B2A4A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #E6F0FA;
      color: #2B6CB0;
      padding: 10px 14px;
      text-align: left;
      font-size: 14px;
      font-weight: 700;
      border-bottom: 2px solid #C8D9EF;
    }
    th:last-child {
      text-align: right;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #E6F0FA;
      font-size: 14px;
    }
    td:last-child {
      text-align: right;
      font-weight: 700;
      color: #2B6CB0;
    }
    td:first-child {
      background: #F0F6FF;
      font-weight: 600;
      color: #2B6CB0;
      border-radius: 4px;
    }
    tr:nth-child(even) td {
      background: transparent;
    }
    tr:nth-child(even) td:first-child {
      background: #F0F6FF;
    }
    .print-footer {
      margin-top: 30px;
      text-align: center;
      border-top: 2px solid #C8D9EF;
      padding-top: 16px;
      color: #5A6B8A;
      font-size: 12px;
    }
    .timestamp {
      font-size: 11px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>Bajaj Dyeing Unit</h1>
    <p>Recipe Batch Print — ${cart.length} Recipe(s)</p>
  </div>
  <div class="recipes-grid">
    ${cart.map(item => `
      <div class="recipe-card">
        <div class="recipe-card-header">
          <div>
            <span class="shade-title">Shade #${item.shadeNumber}</span>
            <span class="badge badge-program">${item.programNumber}</span>
            ${item.rc === 'Yes' ? '<span class="badge badge-rc">RC</span>' : ''}
          </div>
          <span class="badge badge-weight">${item.weight} kg</span>
        </div>
        <div class="recipe-info">
          <div>Original: <span>${item.originalWeight} kg</span></div>
          <div>Scaled to: <span>${item.weight} kg</span></div>
          <div>Dyes: <span>${item.dyes.length}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Dye / Chemical</th>
              <th>Quantity (gm)</th>
            </tr>
          </thead>
          <tbody>
            ${item.dyes.map(dye => `
              <tr>
                <td>${dye.dye_name}</td>
                <td>${dye.quantity.toFixed(3)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>
  <div class="print-footer">
    <p>Generated on: ${new Date().toLocaleString()}</p>
    <p class="timestamp">Bajaj Dyeing Unit — Confidential</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
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
            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />

      {/* Header with Cart */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, shadowColor: colors.shadow }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recipe Calculator</Text>
        <TouchableOpacity
          style={[styles.cartButton, { backgroundColor: cart.length > 0 ? colors.primary : colors.inputBackground }]}
          onPress={() => setShowCart(true)}
        >
          <Text style={[styles.cartButtonText, { color: cart.length > 0 ? '#fff' : colors.textSecondary }]}>
            🛒 {cart.length}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shade Info */}
        <View style={[styles.shadeInfoCard, { backgroundColor: colors.card, borderColor: colors.primary, shadowColor: colors.shadow }]}>
          <View style={styles.shadeHeader}>
            <Text style={[styles.shadeNumber, { color: colors.primary }]}>Shade #{shade.shade_number}</Text>
            <View style={styles.badgeRow}>
              {shade.rc === 'Yes' && (
                <View style={[styles.rcBadge]}>
                  <Text style={styles.rcBadgeText}>RC</Text>
                </View>
              )}
              <View style={styles.programBadge}>
                <Text style={styles.programText}>{shade.program_number || 'P1'}</Text>
              </View>
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
        </View>

        {/* Weight Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⚖️ Select Weight</Text>
          <View style={styles.machineButtons}>
            {MACHINE_WEIGHTS.map((weight) => (
              <TouchableOpacity
                key={weight}
                style={[
                  styles.machineButton,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  selectedMachine === weight && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedMachine(weight)}
              >
                <Text
                  style={[
                    styles.machineButtonText,
                    { color: colors.textSecondary },
                    selectedMachine === weight && { color: '#fff' },
                  ]}
                >
                  {weight} kg
                </Text>
                {selectedMachine === weight && (
                  <Text style={styles.machineButtonCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scaled Recipe for Selected Machine */}
        {allMachinesData[selectedMachine] && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                📋 Recipe for {selectedMachine} kg
              </Text>
              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  { backgroundColor: addedFeedback ? colors.success : colors.primary },
                ]}
                onPress={addToCart}
              >
                <Text style={styles.addToCartButtonText}>
                  {addedFeedback ? '✓ Added!' : '🛒 Add to Cart'}
                </Text>
              </TouchableOpacity>
            </View>

            {allMachinesData[selectedMachine].map((dye, index) => (
              <View key={index} style={[styles.scaledDyeRow, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={[styles.dyeNameBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.scaledDyeName, { color: colors.primary }]}>{dye.dye_name}</Text>
                </View>
                <Text style={[styles.scaledDyeQuantity, { color: colors.primary }]}>
                  {dye.quantity.toFixed(3)} gm
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Original Recipe */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📝 Original Recipe ({shade.original_weight} kg)
          </Text>
          {shade.dyes.map((dye, index) => (
            <View key={index} style={[styles.dyeRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.dyeNameBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.dyeName, { color: colors.primary }]}>{dye.dye_name}</Text>
              </View>
              <View style={styles.dyeQuantities}>
                <Text style={[styles.dyeQuantity, { color: colors.primary }]}>{dye.quantity.toFixed(3)} gm</Text>
                <Text style={[styles.dyePerKg, { color: colors.textSecondary }]}>
                  ({calculatePerKg(dye.quantity).toFixed(3)} gm/kg)
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* All Machines Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 All Machines Comparison</Text>
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
                    <View style={[styles.dyeNameBadgeSmall, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.tableCellText, { color: colors.primary, fontWeight: '600' }]}>{dye.dye_name}</Text>
                    </View>
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
                          selectedMachine === weight && { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tableCellText,
                            { color: colors.text },
                            selectedMachine === weight && { color: '#fff', fontWeight: 'bold' },
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

      {/* Cart Modal */}
      <Modal
        visible={showCart}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCart(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.cartModal, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            {/* Cart Header */}
            <View style={[styles.cartHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cartTitle, { color: colors.text }]}>🛒 Recipe Cart ({cart.length})</Text>
              <TouchableOpacity onPress={() => setShowCart(false)} style={styles.cartCloseBtn}>
                <Text style={[styles.cartCloseBtnText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.cartEmpty}>
                <Text style={[styles.cartEmptyText, { color: colors.textSecondary }]}>
                  Cart is empty. Add recipes from the calculator!
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartList}>
                  {cart.map((item, index) => (
                    <View key={item.id} style={[styles.cartItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={styles.cartItemHeader}>
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartItemShade, { color: colors.primary }]}>
                            Shade #{item.shadeNumber}
                          </Text>
                          <View style={[styles.cartWeightBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.cartWeightBadgeText}>{item.weight} kg</Text>
                          </View>
                          <View style={[styles.cartProgramBadge, { backgroundColor: '#FF9800' }]}>
                            <Text style={styles.cartProgramBadgeText}>{item.programNumber}</Text>
                          </View>
                          {item.rc === 'Yes' && (
                            <View style={[styles.cartRcBadge, { backgroundColor: '#805AD5' }]}>
                              <Text style={styles.cartRcBadgeText}>RC</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.cartRemoveBtn, { backgroundColor: colors.danger }]}
                          onPress={() => removeFromCart(item.id)}
                        >
                          <Text style={styles.cartRemoveBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cartItemDyes}>
                        {item.dyes.slice(0, 4).map((dye, dIdx) => (
                          <View key={dIdx} style={styles.cartDyeRow}>
                            <Text style={[styles.cartDyeName, { color: colors.text }]} numberOfLines={1}>{dye.dye_name}</Text>
                            <Text style={[styles.cartDyeQty, { color: colors.primary }]}>{dye.quantity.toFixed(2)} gm</Text>
                          </View>
                        ))}
                        {item.dyes.length > 4 && (
                          <Text style={[styles.cartMoreText, { color: colors.textSecondary }]}>
                            +{item.dyes.length - 4} more dyes...
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.cartFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.clearCartButton, { backgroundColor: colors.danger }]}
                    onPress={clearCart}
                  >
                    <Text style={styles.clearCartButtonText}>🗑 Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.printAllButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setShowCart(false);
                      handleBulkPrint();
                    }}
                  >
                    <Text style={styles.printAllButtonText}>🖨️ Print All (A1)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  cartButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  cartButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  shadeInfoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  programBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  programText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rcBadge: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rcBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  addToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dyeRow: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dyeName: {
    fontSize: 15,
    flex: 1,
    fontWeight: '700',
  },
  dyeNameBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  dyeNameBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dyeQuantities: {
    alignItems: 'flex-end',
  },
  dyeQuantity: {
    fontSize: 15,
    fontWeight: '600',
  },
  dyePerKg: {
    fontSize: 11,
    marginTop: 2,
  },
  machineButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  machineButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  machineButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  machineButtonCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  scaledDyeRow: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  scaledDyeName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  scaledDyeQuantity: {
    fontSize: 17,
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
  headerCell: {},
  dyeNameCell: {
    width: 140,
    alignItems: 'flex-start',
  },
  machineCell: {
    width: 80,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableCellText: {
    fontSize: 14,
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
  goBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Cart Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cartModal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  cartCloseBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  cartEmptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  cartList: {
    maxHeight: 400,
    padding: 16,
  },
  cartItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  cartItemShade: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartWeightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cartWeightBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cartProgramBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cartProgramBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cartRcBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cartRcBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cartRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartRemoveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cartItemDyes: {
    gap: 4,
  },
  cartDyeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  cartDyeName: {
    fontSize: 13,
    flex: 1,
  },
  cartDyeQty: {
    fontSize: 13,
    fontWeight: '600',
  },
  cartMoreText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cartFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  clearCartButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearCartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  printAllButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  printAllButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
