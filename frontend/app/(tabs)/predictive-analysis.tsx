// frontend/app/(tabs)/predictive-analysis.tsx

import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { PieChart } from 'react-native-chart-kit'
import { useRouter, useFocusEffect } from 'expo-router'
import { databaseService } from '../../services/DatabaseService'
import { predictiveService, Recommendation } from '../../services/PredictiveService'
import type { ItemTotal } from '../../services/DatabaseService'
import { MaterialIcons } from '@expo/vector-icons'

// Convert cm to pixels (1cm ≈ 37.8 pixels)
const CM_TO_PX = 37.8;
const TOP_BOTTOM_GAP = 1 * CM_TO_PX; // 1cm gap

// Generate distinct colors for pie chart
const generateDistinctColors = (count: number) => {
  const colors = [];
  const hueStep = Math.floor(360 / count);
  
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep) % 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  
  return colors;
};

export default function PredictiveAnalysisScreen() {
  const router = useRouter()
  const today = new Date()
  const [mode, setMode] = useState<'range' | 'single'>('range')
  const [start, setStart] = useState<Date>(today)
  const [end, setEnd] = useState<Date | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [pickerStage, setPickerStage] = useState<'start' | 'end' | 'single'>('single')

  const [pieData, setPieData] = useState<Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
    percentage: string;
  }>>([])
  const [recs, setRecs] = useState<Recommendation[]>([])

  // Get current window dimensions
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  // Calculate dimensions based on orientation
  const PADDING = 16;
  const COLUMN_GAP = 12;
  const COLUMN_WIDTH = isLandscape ? 
    (width - PADDING * 2 - COLUMN_GAP) / 2 - 20 : 
    width - PADDING * 2 - 20;

  // intercept back to go Dashboard
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        router.replace('/(tabs)/admin-dashboard-billing')
        return true
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => sub.remove()
    }, [router])
  )

  // date-picker
  const openPicker = (stage: 'start' | 'end' | 'single') => {
    setPickerStage(stage)
    setPickerVisible(true)
  }
  const onPick = (d: Date) => {
    setPickerVisible(false)
    if (pickerStage === 'single') {
      setStart(d)
      setEnd(null)
    } else if (pickerStage === 'start') {
      setStart(d)
      setEnd(null)
      setTimeout(() => openPicker('end'), 50)
    } else {
      setEnd(d)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        // bounds
        const s = new Date(start)
        s.setHours(0, 0, 0, 0)
        const eBase = mode === 'single' ? start : end || start
        const e = new Date(eBase)
        e.setHours(23, 59, 59, 999)
        const sIso = s.toISOString(),
          eIso = e.toISOString()

        // pie
        const items: ItemTotal[] = await databaseService.getItemTotalsForDateRange(sIso, eIso)
        const tot = items.reduce((a, b) => a + b.totalQty, 0) || 1
        
        // Generate distinct colors
        const colors = generateDistinctColors(items.length);
        
        // Calculate percentages and prepare data
        const unsortedData = items.map((it, i) => {
          const percentage = (it.totalQty / tot) * 100;
          return {
            name: it.item_name,
            population: it.totalQty,
            percentage: percentage.toFixed(1) + '%',
            color: colors[i],
            legendFontColor: '#333',
            legendFontSize: 12
          }
        });

        // Sort by percentage in ascending order
        const sortedData = [...unsortedData].sort((a, b) => a.population - b.population);
        
        // Format the name to include both quantity and percentage
        const formattedData = sortedData.map(item => ({
          ...item,
          name: `${item.name} (${item.population} - ${item.percentage})`
        }));

        setPieData(formattedData);

        // recommendations
        const recommendations = await predictiveService.getRecommendations(sIso, eIso, 5)
        setRecs(recommendations)
      } catch (err: any) {
        Alert.alert('Error', err.message)
      }
    }
    load()
  }, [start, end, mode])

  const fmtDate = () =>
    mode === 'single'
      ? start.toLocaleDateString()
      : `${start.toLocaleDateString()} → ${end ? end.toLocaleDateString() : '...'}`

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Header with 1cm top/bottom gap */}
      <View style={[s.header, { paddingTop: TOP_BOTTOM_GAP, paddingBottom: TOP_BOTTOM_GAP }]}>
        <Text style={s.title}>Predictive Analysis</Text>
      </View>
      
      <View style={[s.columns, isLandscape && s.landscapeColumns]}>
        {/* Left Column - Chart */}
        <View style={[s.leftCol, isLandscape && s.landscapeLeftCol]}>
          <View style={s.controls}>
            <View style={s.row}>
              <TouchableOpacity
                style={[s.toggleBtn, mode === 'range' && s.toggleBtnActive]}
                onPress={() => {
                  setMode('range')
                  setEnd(null)
                }}
              >
                <Text style={[s.toggleTxt, mode === 'range' && s.toggleTxtActive]}>Date Range</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, mode === 'single' && s.toggleBtnActive]}
                onPress={() => {
                  setMode('single')
                  setEnd(null)
                }}
              >
                <Text style={[s.toggleTxt, mode === 'single' && s.toggleTxtActive]}>Single Day</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={s.dateInput} 
              onPress={() => openPicker(mode === 'single' ? 'single' : 'start')}
            >
              <MaterialIcons name="date-range" size={20} color="#006400" />
              <Text style={s.dateText}>{fmtDate()}</Text>
            </TouchableOpacity>
          </View>
          
          <DateTimePickerModal
            isVisible={pickerVisible}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onConfirm={onPick}
            onCancel={() => setPickerVisible(false)}
          />

          <Text style={s.subheader}>Sales Composition</Text>
          
          {pieData.length > 0 ? (
            <View style={s.chartContainer}>
              <PieChart
                data={pieData}
                width={isLandscape ? COLUMN_WIDTH : COLUMN_WIDTH * 0.85}
                height={isLandscape ? 220 : 400}
                chartConfig={{
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: () => `#000`,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: 'bold'
                  }
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
                hasLegend
                avoidFalseZero
                center={[10, 10]} // Adjust center position
  style={{ marginVertical: 10 }}
              />
            </View>
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="pie-chart" size={40} color="#ccc" />
              <Text style={s.emptyText}>No sales data available</Text>
            </View>
          )}
        </View>

        {/* Right Column - Recommendations */}
        <View style={[s.rightCol, isLandscape && s.landscapeRightCol]}>
          <Text style={s.subheader}>Recommendations</Text>
          
          {recs.length > 0 ? (
            <View style={s.recContainer}>
              <ScrollView>
                {recs.map((r, i) => (
                  <View key={i} style={[s.recItem, i === 0 && s.topRecItem]}>
                    <View style={s.recIconContainer}>
                      <MaterialIcons 
                        name={i === 0 ? "star" : "lightbulb-outline"} 
                        size={22} 
                        color={i === 0 ? "#FFD700" : "#006400"} 
                      />
                    </View>
                    <View style={s.recContent}>
                      <Text style={s.recItemName}>{r.item}</Text>
                      <Text style={s.recText}>{r.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="lightbulb" size={40} color="#ccc" />
              <Text style={s.emptyText}>No recommendations yet</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: '#fff' },
  header:          { 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faf8',
  },
  title:           { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#006400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columns:         { 
    flex: 1, 
    padding: 16,
    paddingTop: 20
  },
  landscapeColumns: {
    flexDirection: 'row',
  },
  leftCol:         { 
    width: '100%',
    marginBottom: 20
  },
  landscapeLeftCol: {
    width: '48%',
    marginRight: '4%',
    marginBottom: 0
  },
  rightCol:        { 
    width: '100%',
    flex: 1
  },
  landscapeRightCol: {
    width: '48%',
    flex: 1
  },
  controls:        { marginBottom: 16 },
  row:             { 
    flexDirection: 'row', 
    marginBottom: 12,
    justifyContent: 'space-between'
  },
  toggleBtn:       { 
    flex: 1, 
    padding: 10, 
    borderWidth: 1, 
    borderColor: '#006400', 
    borderRadius: 8, 
    marginRight: 6,
    alignItems: 'center'
  },
  toggleBtnActive: { backgroundColor: '#006400' },
  toggleTxt:       { textAlign: 'center', color: '#006400', fontWeight: '600' },
  toggleTxtActive: { color: '#fff', fontWeight: '600' },
  dateInput:       { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  dateText:        { marginLeft: 8, color: '#333', fontWeight: '500' },
  subheader:       { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12,
    color: '#2c3e50',
    marginTop: 8
  },
  chartContainer:  {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center'
  },
  recContainer:    {
    flex: 1,
  },
  recItem:         { 
    backgroundColor: '#f8fff8', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  topRecItem:      {
    backgroundColor: '#f8fcf0',
    borderLeftColor: '#FFD700',
  },
  recIconContainer: { 
    padding: 4,
    marginRight: 10,
    marginTop: 2
  },
  recContent:      { flex: 1 },
  recItemName:     { 
    fontSize: 15, 
    fontWeight: '700',
    color: '#006400'
  },
  recText:         { 
    marginTop: 4, 
    fontSize: 13, 
    color: '#444',
    lineHeight: 18
  },
  emptyState:      {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 10
  },
  emptyText:       {
    marginTop: 10,
    color: '#888',
    fontSize: 14,
    textAlign: 'center'
  }
})