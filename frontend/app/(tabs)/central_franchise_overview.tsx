// frontend/app/(tabs)/central_franchise_overview.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  BackHandler,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { databaseService, ItemTotal, FullBillRow } from '../../services/DatabaseService';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
const PADDING = isTablet ? 24 : 16;
const CHART_WIDTH = SCREEN_WIDTH - PADDING * 2;
const BAR_CHART_HEIGHT = isTablet ? 280 : 220;
const PIE_CHART_HEIGHT = isTablet ? 320 : 280;
const SPACING = isTablet ? 20 : 16;
const PRIMARY_COLOR = '#4A6FA5';
const SECONDARY_COLOR = '#6B8CBE';
const ACCENT_COLOR = '#FF7E5F';
const LIGHT_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CM_TO_PX = 37.8; // 1cm ≈ 37.8px
const TOP_GAP = 2 * CM_TO_PX; // 2cm gap
// hours for the 24-hour chart
const hourLabels = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 0
    ? i === 0
      ? '12 AM'
      : i < 12
        ? `${i} AM`
        : i === 12
          ? '12 PM'
          : `${i - 12} PM`
    : ''
);

// slice colors
const SLICE_COLORS = ['#4CAF50','#2196F3','#FFC107','#9C27B0','#F44336','#03A9F4','#E91E63'];

// format as YYYY-MM-DD for Excel filename
const toISODate = (d: Date) => {
  const Y = d.getFullYear();
  const M = String(d.getMonth()+1).padStart(2,'0');
  const D = String(d.getDate()).padStart(2,'0');
  return `${Y}-${M}-${D}`;
};

export default function CentralFranchiseOverviewScreen() {
  const router = useRouter();

  // intercept Android back to go to central dashboard
  useFocusEffect(useCallback(() => {
    const onBack = () => {
      router.replace('/(tabs)/central_dashboard');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [router]));

  // 1) input controls
  const [inputId, setInputId] = useState('');
  const [fid, setFid] = useState<string|null>(null);

  // 2) date-range controls
  const today = new Date();
  const [reportType, setReportType] = useState<'range'|'single'>('range');
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date|null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStage, setPickerStage] = useState<'start'|'end'|'single'>('single');

  // 3) summary & chart state
  const [loading, setLoading] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [hourlyOrders, setHourlyOrders] = useState<number[]>(Array(24).fill(0));
  const [dailySales, setDailySales] = useState<number[]>([]);
  const [dailyLabels, setDailyLabels] = useState<string[]>([]);
  const [pieData, setPieData] = useState<
    { name:string; population:number; color:string; legendFontColor:string; legendFontSize:number }[]
  >([]);

  // 4) modal
  const [chartMode, setChartMode] = useState<'hour'|'day'>('hour');
  const [modalVisible, setModalVisible] = useState(false);

  // --- Handlers ---

  // normalize and set the franchise ID
  const applyFid = () => {
    const raw = inputId.trim().toUpperCase();
    if (!raw) {
      Alert.alert('Please enter a Franchise ID');
      return;
    }
    const norm = raw.startsWith('FR-') ? raw : `FR-${raw}`;
    setFid(norm);
  };

  // pickers
  const showPicker = (stage:'start'|'end'|'single') => {
    setPickerStage(stage);
    setPickerVisible(true);
  };
  const handleConfirm = (d: Date) => {
    setPickerVisible(false);
    if (pickerStage === 'single') {
      setStartDate(d);
      setEndDate(null);
    } else if (pickerStage === 'start') {
      setStartDate(d);
      setEndDate(null);
      setTimeout(()=>showPicker('end'),50);
    } else {
      setEndDate(d);
    }
  };

  // whenever fid or dates change, reload everything
  useEffect(() => {
    if (!fid) return;
    (async () => {
      setLoading(true);
      // build full-day UTC window
      const s = new Date(startDate); s.setHours(0,0,0,0);
      const base = reportType === 'single' ? startDate : (endDate || startDate);
      const e = new Date(base); e.setHours(23,59,59,999);
      const fromIso = s.toISOString();
      const toIso   = e.toISOString();

      try {
        // summary
        const rev = await databaseService.getRevenueForDateRange(fromIso,toIso,fid);
        const cnt = await databaseService.getOrderCountForDateRange(fromIso,toIso,fid);
        setRevenue(rev);
        setOrders(cnt);
        setAvgValue(cnt>0 ? rev/cnt : 0);

        // hourly
        const hrsRaw = await databaseService.getBillRowsForDateRange(fromIso,toIso,fid);
        const hrs = Array(24).fill(0);
        hrsRaw.forEach(r => hrs[new Date(r.created_at).getHours()]++);
        setHourlyOrders(hrs);

        // daily
        const days: Date[] = [];
        for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
          days.push(new Date(d));
        }
        const dailyTotals = await Promise.all(days.map(d => {
          const ds = new Date(d); ds.setHours(0,0,0,0);
          const de = new Date(d); de.setHours(23,59,59,999);
          return databaseService.getRevenueForDateRange(ds.toISOString(),de.toISOString(),fid);
        }));
        setDailySales(dailyTotals);
        setDailyLabels(days.map(d => d.toLocaleDateString('en-US',{ weekday:'short' })));

        // pie
        const items: ItemTotal[] = await databaseService.getItemTotalsForDateRange(fromIso,toIso,fid);
        setPieData(items.map((it,i)=>({
          name: `${it.item_name} (${it.totalQty})`,
          population: it.totalQty,
          color: SLICE_COLORS[i%SLICE_COLORS.length],
          legendFontColor: '#333',
          legendFontSize: 12,
        })));
      } catch(err:any){
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fid,startDate,endDate,reportType]);

  // formatted date label
  const formattedDate = () =>
    reportType==='single'
      ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${
          endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'
        }`;

  // open modal
  const openModal = (mode:'hour'|'day') => {
    setChartMode(mode);
    setModalVisible(true);
  };

  // export to Excel (for that franchise)
  const exportToExcel = async () => {
    try {
      const all: FullBillRow[] = await databaseService.getAllBillingData(); 
      // filter by fid
      const fil = all.filter(b => b.items[0]?.franchise_id === fid);
      const flat = fil.flatMap(b =>
        b.items.map(i=>({
          bill_id: b.id,
          created_at: b.created_at,
          total: b.total,
          item_name: i.item_name,
          qty: i.qty,
          price: i.price,
        }))
      );
      const ws = XLSX.utils.json_to_sheet(flat);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      const wbout = XLSX.write(wb, { type:'base64', bookType:'xlsx' });
      const fn = FileSystem.documentDirectory + `sales_${fid}_${toISODate(new Date())}.xlsx`;
      await FileSystem.writeAsStringAsync(fn, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fn, {
        mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch(e:any){
      Alert.alert('Export failed', e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS==='ios'?'padding':undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Franchise Performance</Text>
          <Text style={styles.headerSubtitle}>Detailed analytics and reporting</Text>
        </View>

        {/* 1) Franchise ID Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Franchise</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter Franchise ID (e.g. FR-001)"
              placeholderTextColor="#999"
              value={inputId}
              onChangeText={setInputId}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.goBtn} onPress={applyFid}>
              <Text style={styles.goText}>VIEW</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2) Date Pickers */}
        {fid && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Date Range</Text>
            <View style={styles.dateToggleRow}>
              <TouchableOpacity
                style={[styles.dateToggleBtn, reportType==='range' && styles.dateToggleBtnActive]}
                onPress={()=>{ setReportType('range'); setEndDate(null); }}
              >
                <Text style={[styles.dateToggleText, reportType==='range' && styles.dateToggleTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateToggleBtn, reportType==='single' && styles.dateToggleBtnActive]}
                onPress={()=>{ setReportType('single'); setEndDate(null); }}
              >
                <Text style={[styles.dateToggleText, reportType==='single' && styles.dateToggleTextActive]}>
                  Single Day
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={()=>showPicker(reportType==='single'?'single':'start')}
            >
              <MaterialIcons name="event" size={20} color={PRIMARY_COLOR}/>
              <Text style={styles.dateText}>{formattedDate()}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={pickerVisible}
              mode="date"
              display={Platform.OS==='ios'?'inline':'default'}
              onConfirm={handleConfirm}
              onCancel={()=>setPickerVisible(false)}
            />
          </View>
        )}

        {/* 3) Summary & Export */}
        {fid && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <MaterialIcons name="attach-money" size={24} color="#4CAF50"/>
              </View>
              <Text style={styles.summaryValue}>₹{revenue.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <MaterialIcons name="receipt" size={24} color="#2196F3"/>
              </View>
              <Text style={styles.summaryValue}>{orders.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <MaterialIcons name="calculate" size={24} color="#FFC107"/>
              </View>
              <Text style={styles.summaryValue}>₹{avgValue.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Avg. Order Value</Text>
            </View>
            <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
              <MaterialIcons name="file-download" size={20} color="#fff"/>
              {isTablet && <Text style={styles.exportText}>Export Data</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 4) Charts */}
        {fid && (
          <View style={styles.chartsContainer}>
            {/* Hourly */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Hourly Sales Pattern</Text>
                <TouchableOpacity 
                  style={styles.fullscreenBtn}
                  onPress={()=>openModal('hour')}
                >
                  <MaterialIcons name="fullscreen" size={20} color="#666"/>
                </TouchableOpacity>
              </View>
              <BarChart
                data={{ labels: hourLabels, datasets: [{ data: hourlyOrders }] }}
                width={CHART_WIDTH} 
                height={BAR_CHART_HEIGHT}
                fromZero 
                showValuesOnTopOfBars
                chartConfig={{
                  backgroundGradientFrom: CARD_BG, 
                  backgroundGradientTo: CARD_BG,
                  decimalPlaces: 0,
                  color: op => `rgba(74, 111, 165, ${op})`,
                  labelColor: () => '#555',
                  barPercentage: isTablet ? 0.7 : 0.5,
                  propsForLabels: { fontSize: isTablet ? 12 : 10 },
                  fillShadowGradient: SECONDARY_COLOR,
                  fillShadowGradientOpacity: 1,
                  barRadius: 4,
                }}
                style={styles.chart} 
                yAxisLabel={''} 
                yAxisSuffix={''}
              />
            </View>

            {/* Daily */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Daily Sales Trend</Text>
                <TouchableOpacity 
                  style={styles.fullscreenBtn}
                  onPress={()=>openModal('day')}
                >
                  <MaterialIcons name="fullscreen" size={20} color="#666"/>
                </TouchableOpacity>
              </View>
              <BarChart
                data={{ labels: dailyLabels, datasets: [{ data: dailySales }] }}
                width={CHART_WIDTH} 
                height={BAR_CHART_HEIGHT}
                fromZero 
                showValuesOnTopOfBars
                horizontalLabelRotation={45}
                chartConfig={{
                  backgroundGradientFrom: CARD_BG, 
                  backgroundGradientTo: CARD_BG,
                  decimalPlaces: 0,
                  color: op => `rgba(74, 111, 165, ${op})`,
                  labelColor: () => '#555',
                  barPercentage: isTablet ? 0.7 : 0.6,
                  propsForLabels: { fontSize: isTablet ? 12 : 10 },
                  fillShadowGradient: SECONDARY_COLOR,
                  fillShadowGradientOpacity: 1,
                  barRadius: 4,
                }}
                style={styles.chart} 
                yAxisLabel={''} 
                yAxisSuffix={''}
              />
            </View>

            {/* Item Mix */}
            {!!pieData.length && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Product Mix Analysis</Text>
                <PieChart
                  data={pieData}
                  width={CHART_WIDTH} 
                  height={PIE_CHART_HEIGHT}
                  chartConfig={{
                    backgroundGradientFrom: CARD_BG, 
                    backgroundGradientTo: CARD_BG,
                    color: () => '#555'
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft={isTablet ? '25' : '25'}
                  absolute 
                  hasLegend
                  style={styles.chart}
                  avoidFalseZero
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 5) Full-screen Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={()=>setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {chartMode==='hour' ? 'HOURLY SALES ANALYSIS' : 'DAILY SALES TREND'}
            </Text>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={()=>setModalVisible(false)}
            >
              <MaterialIcons name="close" size={28} color="#333"/>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.modalScrollContent}
          >
            {chartMode==='hour' ? (
              <BarChart
                data={{ labels: hourLabels, datasets: [{ data: hourlyOrders }] }}
                width={SCREEN_WIDTH * (isTablet ? 2 : 1.5)} 
                height={SCREEN_HEIGHT * (isTablet ? 0.7 : 0.6)}
                fromZero 
                showValuesOnTopOfBars
                chartConfig={{
                  backgroundGradientFrom: CARD_BG, 
                  backgroundGradientTo: CARD_BG,
                  decimalPlaces: 0,
                  color: op => `rgba(74, 111, 165, ${op})`,
                  labelColor: () => '#555',
                  barPercentage: 0.7,
                  propsForLabels: { fontSize: isTablet ? 14 : 12 },
                  fillShadowGradient: SECONDARY_COLOR,
                  fillShadowGradientOpacity: 1,
                  barRadius: 4,
                }}
                style={styles.modalChart} 
                yAxisLabel={''} 
                yAxisSuffix={''}
              />
            ) : (
              <BarChart
                data={{ labels: dailyLabels, datasets: [{ data: dailySales }] }}
                width={SCREEN_WIDTH * (isTablet ? 2 : 1.5)} 
                height={SCREEN_HEIGHT * (isTablet ? 0.7 : 0.6)}
                fromZero 
                showValuesOnTopOfBars
                horizontalLabelRotation={45}
                chartConfig={{
                  backgroundGradientFrom: CARD_BG, 
                  backgroundGradientTo: CARD_BG,
                  decimalPlaces: 0,
                  color: op => `rgba(74, 111, 165, ${op})`,
                  labelColor: () => '#555',
                  barPercentage: 0.7,
                  propsForLabels: { fontSize: isTablet ? 14 : 12 },
                  fillShadowGradient: SECONDARY_COLOR,
                  fillShadowGradientOpacity: 1,
                  barRadius: 4,
                }}
                style={styles.modalChart} 
                yAxisLabel={''} 
                yAxisSuffix={''}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: LIGHT_BG 
  },
  scrollContent: { 
    paddingBottom: 40,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: PADDING,
    marginBottom: 16,
    marginStart: 5,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 5,
    
  },
  headerSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#666',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: PADDING,
    marginHorizontal: PADDING,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: isTablet ? 16 : 14,
    color: '#333',
  },
  goBtn: {
    marginLeft: 12,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: isTablet ? 24 : 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isTablet ? 100 : 80,
  },
  goText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: isTablet ? 16 : 14,
  },

  dateToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  dateToggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateToggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateToggleText: { 
    color: '#666', 
    fontWeight: '600',
    fontSize: isTablet ? 15 : 13,
  },
  dateToggleTextActive: { 
    color: PRIMARY_COLOR,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  dateText: { 
    flex: 1,
    marginLeft: 10, 
    color: '#333', 
    fontSize: isTablet ? 16 : 14,
  },

  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    marginBottom: SPACING,
  },
  summaryCard: {
    width: isTablet ? '32%' : '48%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 111, 165, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: { 
    fontSize: isTablet ? 22 : 18, 
    fontWeight: '700', 
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: { 
    fontSize: isTablet ? 15 : 13, 
    color: '#666',
  },
  exportBtn: {
    width: isTablet ? '32%' : '48%',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: isTablet ? 16 : 14,
  },

  chartsContainer: { 
    paddingHorizontal: PADDING,
  },
  chartCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: { 
    fontSize: isTablet ? 20 : 18, 
    fontWeight: '700', 
    color: PRIMARY_COLOR,
  },
  fullscreenBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  chart: { 
    borderRadius: 12, 
    overflow: 'hidden',
    marginTop: 8,
  },

  modalSafeArea: { 
    flex: 1, 
    backgroundColor: CARD_BG,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: PADDING,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: LIGHT_BG,
  },
  modalTitle: { 
    flex: 1, 
    textAlign: 'center', 
    fontSize: isTablet ? 22 : 20, 
    fontWeight: '700', 
    color: PRIMARY_COLOR,
  },
  modalCloseBtn: { 
    padding: 8,
  },
  modalScrollContent: { 
    paddingHorizontal: PADDING,
    paddingVertical: 20,
  },
  modalChart: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
});