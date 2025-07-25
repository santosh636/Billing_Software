import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, useWindowDimensions, BackHandler, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_PADDING = 20;
const TOP_MARGIN = 40;
const HEADER_BOTTOM_MARGIN = 20;
const CARD_SPACING = 20;
const CARD_MARGIN_BOTTOM = 25;

const PRIMARY_COLOR = '#006437';
const LIGHT_ACCENT = '#e6f2ed';

type ValidIconName = 'analytics' | 'trending-up' | 'settings';

export default function AdminDashboardBilling() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Dynamic styles based on orientation
  const dynamicStyles = StyleSheet.create({
    card: {
      flex: isPortrait ? 0.3 : 1,
      aspectRatio: isPortrait ? undefined : 1,
      height: isPortrait ? Dimensions.get('window').height * 0.25 : undefined,
      backgroundColor: '#fff',
      borderRadius: 16,
      borderColor: '#e0e0e0',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      padding: 20,
      marginBottom: isPortrait ? CARD_MARGIN_BOTTOM : 0,
      marginHorizontal: isPortrait ? 0 : CARD_SPACING / 2,
    },
  });

  const renderCards = () => {
    if (isPortrait) {
      // Mobile (Portrait) View - Three rows with one card each
      return (
        <View style={styles.portraitContainer}>
          <Card 
            onPress={() => router.push('/(tabs)/predictive-analysis')} 
            icon="analytics" 
            title="Predictive Analysis" 
            style={dynamicStyles.card}
          />
          <Card 
            onPress={() => router.push('/(tabs)/sales-overview')} 
            icon="trending-up" 
            title="Sales Overview" 
            style={dynamicStyles.card}
          />
          <Card 
            onPress={() => router.push('/(tabs)/settings')} 
            icon="settings" 
            title="Settings" 
            style={dynamicStyles.card}
          />
        </View>
      );
    } else {
      // Landscape View - Three columns with one card each
      return (
        <View style={styles.landscapeContainer}>
          <Card 
            onPress={() => router.push('/(tabs)/predictive-analysis')} 
            icon="analytics" 
            title="Predictive Analysis" 
            style={dynamicStyles.card}
          />
          <Card 
            onPress={() => router.push('/(tabs)/sales-overview')} 
            icon="trending-up" 
            title="Sales Overview" 
            style={dynamicStyles.card}
          />
          <Card 
            onPress={() => router.push('/(tabs)/settings')} 
            icon="settings" 
            title="Settings" 
            style={dynamicStyles.card}
          />
        </View>
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Franchise Dashboard</Text>
          <Text style={styles.subheader}>Billing Overview</Text>
        </View>
        {renderCards()}
      </View>
    </ScrollView>
  );
}

interface CardProps {
  onPress: () => void;
  icon: ValidIconName;
  title: string;
  style: any;
}

const Card = ({ onPress, icon, title, style }: CardProps) => (
  <TouchableOpacity
    style={[styles.cardBase, style]}
    onPress={onPress}
  >
    <View style={styles.cardContent}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={36} color={PRIMARY_COLOR} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: SCREEN_PADDING,
    paddingTop: TOP_MARGIN,
  },
  portraitContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: HEADER_BOTTOM_MARGIN,
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 20,
    color: '#5c5c5c',
    fontWeight: '500',
    textAlign: 'center',
  },
  cardBase: {
    // Common card styles that don't depend on orientation
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    padding: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: LIGHT_ACCENT,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    width: '100%',
  },
});