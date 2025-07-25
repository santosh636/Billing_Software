// frontend/app/(tabs)/billing-history.tsx

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
  BackHandler,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { databaseService } from '../../services/DatabaseService'
import { supabase } from '../../services/SupabaseClient'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PADDING = 35
const GAP     = 20

export default function BillingHistoryScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [bills, setBills] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<number|null>(null)

  // Hardware back → dashboard
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace('/(tabs)/dashboard')
        return true
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => sub.remove()
    }, [router])
  )

  // fetch logic extracted
  const fetchBills = useCallback(async () => {
    try {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const fetched = await databaseService.getGeneratedBills(
        start.toISOString(),
        end.toISOString()
      )
      const withItems = await Promise.all(
        fetched.map(async b => ({
          ...b,
          items: await databaseService.getGeneratedBillItems(b.id)
        }))
      )
      const descending = withItems.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setBills(descending)
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Failed to load billing history.')
    }
  }, [])

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true)
      await fetchBills()
      setLoading(false)
    })()
  }, [fetchBills])

  // pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchBills()
    setRefreshing(false)
  }, [fetchBills])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <View style={s.container}>
      {/* Header + Logout */}
      <View style={s.headerRow}>
        <Text style={s.heading}>Recent Bills</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#006400" />
        </TouchableOpacity>
      </View>

      {/* Conditional Rendering */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#006400" />
        </View>
      ) : bills.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>No bills generated today.</Text>
          <Pressable onPress={() => router.replace('/(tabs)/dashboard')} style={s.backBtn}>
            <Text style={s.backText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={b => b.id.toString()}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item, index }) => {
            const open = expandedId === item.id
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.8}
                onPress={() => setExpandedId(open ? null : item.id)}
              >
                <View style={s.cardHeader}>
                  <Text style={s.billId}>#{index + 1}</Text>
                  <Text style={s.billTotal}>₹{item.total.toFixed(2)}</Text>
                </View>
                <Text style={s.timestamp}>
                  {new Date(item.created_at).toLocaleTimeString()}
                </Text>
                {open && (
                  <View style={s.items}>
                    {item.items.map((it: any, i: number) => (
                      <View key={i} style={s.itemRow}>
                        <Text style={s.itemName}>{it.item_name}</Text>
                        <Text style={s.itemQty}>×{it.qty}</Text>
                        <Text style={s.itemPrice}>₹{it.price.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: PADDING,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: GAP,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#006400',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PADDING,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#006400',
    borderRadius: 24,
  },
  backText: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: PADDING,
    paddingBottom: PADDING,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billId: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  billTotal: {
    color: '#006400',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  items: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemName: {
    flex: 2,
    color: '#444',
    fontSize: 14,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
    color: '#006400',
  },
})
