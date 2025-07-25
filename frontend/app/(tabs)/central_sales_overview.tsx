// frontend/app/(tabs)/sales-overview.tsx

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { databaseService } from '../../services/DatabaseService';
import type { ItemTotal, FullBillRow } from '../../services/DatabaseService';
import { MaterialIcons } from '@expo/vector-icons';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PADDING = 16;
const CHART_WIDTH = SCREEN_WIDTH - PADDING * 2;
const BAR_CHART_HEIGHT = 220;
const PIE_CHART_HEIGHT = 280;
const SPACING = 16;
const CM_TO_PX = 37.8; // 1cm ≈ 37.8 pixels
const TOP_GAP = 2 * CM_TO_PX; // 2cm gap

// format YYYY-MM-DD
const toISODate = (d: Date) => {
  const Y = d.getFullYear();
  const M = String(d.getMonth()+1).padStart(2,'0');
  const D = String(d.getDate()).padStart(2,'0');
  return `${Y}-${M}-${D}`;
};

// hour labels
const hourLabels = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 0
    ? i === 0
      ? '12 AM'
      : i < 12
        ? `${i} AM`
        : i === 12
          ? '12 PM'
          : `${i-12} PM`
    : ''
);

const SLICE_COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#F44336', '#03A9F4', '#E91E63'];

export default function SalesOverviewScreen() {
  const router = useRouter();

  // Intercept swipe-back/hardware-back to always go to Dashboard
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        router.replace('/(tabs)/central_dashboard');
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [router])
  );

  const today = new Date();
  // date-range
  const [reportType, setReportType] = useState<'range'|'single'>('range');
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date|null>(null);

  // picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStage, setPickerStage] = useState<'start'|'end'|'single'>('single');

  // summary
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);
  const [avgValue, setAvgValue] = useState(0);

  // charts
  const [hourlyOrders, setHourlyOrders] = useState<number[]>(Array(24).fill(0));
  const [dailySales, setDailySales] = useState<number[]>([]);
  const [dailyLabels, setDailyLabels] = useState<string[]>([]);

  // pie
  const [pieData, setPieData] = useState<{
    name:string; population:number; color:string;
    legendFontColor:string; legendFontSize:number;
  }[]>([]);

  // modal
  const [chartMode, setChartMode] = useState<'hour'|'day'>('hour');
  const [modalVisible, setModalVisible] = useState(false);

  // date-picker handlers
  function showPicker(stage:'start'|'end'|'single') {
    setPickerStage(stage);
    setPickerVisible(true);
  }
  
  function handleConfirm(d: Date) {
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
  }

  // reload whenever dates change
  useEffect(() => {
    if (!startDate) return;
    (async () => {
      try {
        // build full-day UTC window for the selected span
        const s = new Date(startDate); s.setHours(0,0,0,0);
        const base = reportType==='single' ? startDate : (endDate||startDate);
        const e = new Date(base); e.setHours(23,59,59,999);

        const fromIso = s.toISOString();
        const toIso = e.toISOString();

        // — summary
        const rev = await databaseService.getRevenueForDateRange(fromIso,toIso);
        const cnt = await databaseService.getOrderCountForDateRange(fromIso,toIso);
        setRevenue(rev);
        setOrders(cnt);
        setAvgValue(cnt>0?rev/cnt:0);

        // — hourly
        const hrsRaw = await databaseService.getBillRowsForDateRange(fromIso,toIso);
        const hrs = Array(24).fill(0);
        hrsRaw.forEach(r => hrs[new Date(r.created_at).getHours()]++);
        setHourlyOrders(hrs);

        // — daily
        const days:Date[] = [];
        for (let d=new Date(s); d<=e; d.setDate(d.getDate()+1)) {
          days.push(new Date(d));
        }
        const dailyTotals = await Promise.all(
          days.map(d => {
            const ds = new Date(d); ds.setHours(0,0,0,0);
            const de = new Date(d); de.setHours(23,59,59,999);
            return databaseService.getRevenueForDateRange(
              ds.toISOString(), de.toISOString()
            );
          })
        );
        setDailySales(dailyTotals);
        setDailyLabels(days.map(d=>d.toLocaleDateString('en-US',{ weekday:'short' })));

        // — pie
        const items = await databaseService.getItemTotalsForDateRange(fromIso,toIso);
        const totalQty = items.reduce((sum,i)=>sum+i.totalQty,0) || 1;
        setPieData(items.map((it,i)=>( {
          name: `${it.item_name}`,
          population: it.totalQty,
          color: SLICE_COLORS[i%SLICE_COLORS.length],
          legendFontColor: '#333',
          legendFontSize: 12,
        })));

      } catch(err:any){
        Alert.alert('Error', err.message);
      }
    })();
  }, [startDate,endDate,reportType]);

  const formattedDate = () =>
    reportType==='single'
      ? startDate.toDateString()
      : `${startDate.toDateString()} → ${endDate?endDate.toDateString():'...'}`;

  const openModal = (mode:'hour'|'day') => {
    setChartMode(mode);
    setModalVisible(true);
  };

  // --- Export to Excel ---
  const exportToExcel = async () => {
    try {
      const all: FullBillRow[] = await databaseService.getAllBillingData();
      const flat = all.flatMap(b =>
        b.items.map(i=>( {
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
      const fn = FileSystem.documentDirectory + `sales_${toISODate(new Date())}.xlsx`;
      await FileSystem.writeAsStringAsync(fn, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });
      await Sharing.shareAsync(fn, {
        mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch(e:any){
      Alert.alert('Export failed', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section with 2cm gap and centered title */}
        <View style={[styles.header, { paddingTop: TOP_GAP }]}>
          <View style={styles.headerContent}>
            <Text style={styles.mainTitle}>SALES ANALYTICS</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
              <MaterialIcons name="file-download" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Date Selection */}
        <View style={styles.dateSection}>
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
            <MaterialIcons name="event" size={20} color="#006400" />
            <Text style={styles.dateText}>{formattedDate()}</Text>
          </TouchableOpacity>
        </View>
        
        <DateTimePickerModal
          isVisible={pickerVisible}
          mode="date"
          display={Platform.OS==='ios'?'inline':'default'}
          onConfirm={handleConfirm}
          onCancel={()=>setPickerVisible(false)}
        />

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
            <Text style={styles.summaryValue}>₹{revenue}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <MaterialIcons name="receipt" size={24} color="#2196F3" />
            <Text style={styles.summaryValue}>{orders}</Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <MaterialIcons name="trending-up" size={24} color="#FFC107" />
            <Text style={styles.summaryValue}>₹{avgValue.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Avg. Order Value</Text>
          </View>
        </View>
        
        {/* Charts Section */}
        <View style={styles.chartsContainer}>
          {/* Hourly Sales Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Sales by Hour</Text>
              <TouchableOpacity onPress={() => openModal('hour')}>
                <MaterialIcons name="fullscreen" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <BarChart
              data={{ labels: hourLabels, datasets: [{ data: hourlyOrders }] }}
              width={CHART_WIDTH}
              height={BAR_CHART_HEIGHT}
              fromZero
              showValuesOnTopOfBars
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: op => `rgba(0,100,0,${op})`,
                labelColor: () => '#333',
                barPercentage: 0.5,
                propsForLabels: {
                  fontSize: 10
                }
              }}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
          
          {/* Daily Sales Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Sales by Day</Text>
              <TouchableOpacity onPress={() => openModal('day')}>
                <MaterialIcons name="fullscreen" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <BarChart
              data={{ labels: dailyLabels, datasets: [{ data: dailySales }] }}
              width={CHART_WIDTH}
              height={BAR_CHART_HEIGHT}
              fromZero
              showValuesOnTopOfBars
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: op => `rgba(0,100,0,${op})`,
                labelColor: () => '#333',
                barPercentage: 0.6,
                propsForLabels: {
                  fontSize: 10
                }
              }}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
          
          {/* Items Sales Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Sales by Item</Text>
            </View>
            <PieChart
              data={pieData}
              width={CHART_WIDTH}
              height={PIE_CHART_HEIGHT}
              chartConfig={{ 
                backgroundGradientFrom:'#fff', 
                backgroundGradientTo:'#fff', 
                color:()=>'#333' 
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend
              avoidFalseZero
              style={styles.chart}
            />
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Full-screen Modal for Charts */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={()=>setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {chartMode === 'hour' ? 'HOURLY SALES ANALYSIS' : 'DAILY SALES ANALYSIS'}
            </Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={()=>setModalVisible(false)}
            >
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.modalScrollContent}
            >
              {chartMode === 'hour' ? (
                <View style={styles.modalChartContainer}>
                  <BarChart
                    data={{ labels: hourLabels, datasets: [{ data: hourlyOrders }] }}
                    width={SCREEN_WIDTH * 1.5}
                    height={SCREEN_HEIGHT * 0.6}
                    fromZero
                    showValuesOnTopOfBars
                    chartConfig={{
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 0,
                      color: op => `rgba(0,100,0,${op})`,
                      labelColor: () => '#333',
                      barPercentage: 0.6,
                      propsForLabels: {
                        fontSize: 12
                      }
                    }}
                    style={styles.modalChart}
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </View>
              ) : (
                <View style={styles.modalChartContainer}>
                  <BarChart
                    data={{ labels: dailyLabels, datasets: [{ data: dailySales }] }}
                    width={SCREEN_WIDTH * 1.5}
                    height={SCREEN_HEIGHT * 0.6}
                    fromZero
                    showValuesOnTopOfBars
                    horizontalLabelRotation={45}
                    chartConfig={{
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 0,
                      color: op => `rgba(0,100,0,${op})`,
                      labelColor: () => '#333',
                      barPercentage: 0.6,
                      propsForLabels: {
                        fontSize: 12
                      }
                    }}
                    style={styles.modalChart}
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8faf8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: PADDING,
    paddingBottom: SPACING,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#006400',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  exportBtn: {
    backgroundColor: '#006400',
    padding: 8,
    borderRadius: 20,
    position: 'absolute',
    right: 0,
  },
  
  dateSection: {
    padding: PADDING,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateToggleRow: {
    flexDirection: 'row',
    marginBottom: SPACING,
    backgroundColor: '#f0f4f7',
    borderRadius: 10,
    padding: 4,
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
  },
  dateToggleTextActive: {
    color: '#006400',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    marginLeft: 10,
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: PADDING,
    backgroundColor: '#fff',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8faf8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    color: '#333',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  chartsContainer: {
    padding: PADDING,
    paddingBottom: PADDING * 2,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  chart: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // Enhanced Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: PADDING,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8faf8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006400',
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
    marginLeft: 24,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: PADDING,
  },
  modalScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PADDING,
  },
  modalChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
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