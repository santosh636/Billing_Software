// app/central-dashboard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY_COLOR = 'rgb(0, 100, 55)';
const SECONDARY_COLOR = '#4CAF50';
const LIGHT_ACCENT = '#e6f2ed';
const DARK_TEXT = '#2D3748';
const LIGHT_TEXT = '#718096';

// Define the valid icon names to fix the TypeScript error
type ValidIonicons = 'analytics' | 'trending-up' | 'bar-chart' | 'settings' | 'chevron-forward';

export default function CentralDashboard() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Layout calculations
  const H_PAD = isTablet ? 24 : 16;
  const V_PAD = isTablet ? 24 : 16;
  const CARD_GAP = isTablet ? 20 : 16;
  const HEADER_HEIGHT = isTablet ? 80 : 60;

  // Determine layout based on device and orientation
  let cardWidth: number;
  let cardHeight: number;
  let numColumns = 1;
  let useScrollView = true;
  let gridDirection: 'row' | 'column' = 'column';
  let gridWrap: 'wrap' | 'nowrap' | undefined = 'nowrap';

  if (isTablet) {
    if (isLandscape) {
      // Tablet landscape: 2x2 grid
      numColumns = 2;
      cardWidth = (width - H_PAD * 2 - CARD_GAP * (numColumns - 1)) / numColumns;
      cardHeight = (height - HEADER_HEIGHT - V_PAD * 2 - CARD_GAP) / 2;
      gridDirection = 'row';
      gridWrap = 'wrap';
      useScrollView = false;
    } else {
      // Tablet portrait: vertical layout
      cardWidth = width - H_PAD * 2;
      cardHeight = cardWidth * 0.6;
      gridDirection = 'column';
      gridWrap = 'nowrap';
      useScrollView = true;
    }
  } else {
    // Mobile (always vertical regardless of orientation)
    cardWidth = width - H_PAD * 2;
    cardHeight = cardWidth * 0.6;
    gridDirection = 'column';
    gridWrap = 'nowrap';
    useScrollView = true;
  }

  // Intercept back-press to exit the app
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        BackHandler.exitApp(); // This will close the app
        return true; // Prevent default back behavior
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [])
  );

  const cards = [
    { 
      icon: 'analytics' as ValidIonicons, 
      title: 'Predictive Analysis', 
      route: '/central_predictive_analysis',
      bgColor: '#F0FDF4',
      iconColor: PRIMARY_COLOR
    },
    { 
      icon: 'trending-up' as ValidIonicons, 
      title: 'Sales Overview', 
      route: '/central_sales_overview',
      bgColor: '#EFF6FF',
      iconColor: '#3B82F6'
    },
    { 
      icon: 'bar-chart' as ValidIonicons, 
      title: 'Franchise Sales', 
      route: '/central_franchise_overview',
      bgColor: '#FEF2F2',
      iconColor: '#EF4444'
    },
    { 
      icon: 'settings' as ValidIonicons, 
      title: 'Settings', 
      route: '/central_settings',
      bgColor: '#F5F3FF',
      iconColor: '#7C3AED'
    },
  ];

  const renderCard = (card: typeof cards[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          marginBottom: CARD_GAP,
          backgroundColor: card.bgColor,
        }
      ]}
      onPress={() => router.push(card.route as any)}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
          <Ionicons name={card.icon} size={isTablet ? 40 : 32} color={card.iconColor} />
        </View>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardActionText}>View Details</Text>
          <Ionicons name="chevron-forward" size={20} color={card.iconColor} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingHorizontal: H_PAD }]}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      
      <View style={[styles.headerContainer, { 
        height: HEADER_HEIGHT,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
      }]}>
        <Text style={styles.header} numberOfLines={1} adjustsFontSizeToFit>
          Central Dashboard
        </Text>
      </View>

      {useScrollView ? (
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            { 
              paddingTop: V_PAD,
              paddingBottom: V_PAD * 2 
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.grid, 
            { 
              flexDirection: gridDirection,
              flexWrap: gridWrap,
              gap: CARD_GAP,
            }
          ]}>
            {cards.map(renderCard)}
          </View>
        </ScrollView>
      ) : (
        <View style={[
          styles.scrollContainer, 
          { 
            paddingTop: V_PAD,
            paddingBottom: V_PAD 
          }
        ]}>
          <View style={[
            styles.grid, 
            { 
              flexDirection: gridDirection,
              flexWrap: gridWrap,
              gap: CARD_GAP,
            }
          ]}>
            {cards.map(renderCard)}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  grid: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DARK_TEXT,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActionText: {
    fontSize: 14,
    color: LIGHT_TEXT,
    fontWeight: '500',
  },
});