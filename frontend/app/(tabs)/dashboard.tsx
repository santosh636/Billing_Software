import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions,
  ScrollView,
  Platform,
  BackHandler
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Color constants
const PRIMARY_COLOR = '#006437';
const LIGHT_ACCENT = '#e6f2ed';

export default function DashboardScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const isSmallScreen = height < 600; // For smaller phones

  // Intercept back-press to exit the app
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp(); // This will close the app
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => backHandler.remove();
    }, [])
  );

  // Responsive sizing calculations
  const SCREEN_PADDING = Platform.select({
    ios: isSmallScreen ? 16 : 20,
    android: isSmallScreen ? 14 : 20,
    default: 20
  });
  
  const CARD_SPACING = isSmallScreen ? 12 : 16;
  const CARD_HEIGHT = isPortrait 
    ? height * (isSmallScreen ? 0.35 : 0.4) 
    : height * 0.6;
  
  const CARD_WIDTH = isPortrait 
    ? width - (SCREEN_PADDING * 2) 
    : (width - (SCREEN_PADDING * 2) - CARD_SPACING) / 2;

  return (
    <View style={[styles.container, { padding: SCREEN_PADDING }]}>
      {/* Scrollable content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Header */}
        <View style={[styles.headerContainer, { 
          marginTop: isSmallScreen ? 20 : 30,
          marginBottom: isSmallScreen ? 16 : 24 
        }]}>
          <Text style={[styles.header, { fontSize: isSmallScreen ? 26 : 32 }]}>
            Dashboard
          </Text>
        </View>

        {/* Main content */}
        <View style={isPortrait ? styles.verticalContainer : styles.horizontalContainer}>
          {/* New Bill Card */}
          <TouchableOpacity
            style={[
              styles.card, 
              { 
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                marginBottom: isPortrait ? CARD_SPACING : 0,
                marginRight: isPortrait ? 0 : CARD_SPACING
              }
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/new-bill')}
          >
            <View style={[
              styles.iconContainer, 
              { 
                width: isSmallScreen ? 90 : 120,
                height: isSmallScreen ? 90 : 120,
                borderRadius: isSmallScreen ? 45 : 60,
                marginBottom: isSmallScreen ? 12 : 20
              }
            ]}>
              <Ionicons 
                name="document-text" 
                size={isSmallScreen ? 45 : 60} 
                color={PRIMARY_COLOR} 
              />
            </View>
            <Text style={[styles.cardTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
              New Bill
            </Text>
          </TouchableOpacity>

          {/* Billing History Card */}
          <TouchableOpacity
            style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/billing-history')}
          >
            <View style={[
              styles.iconContainer, 
              { 
                width: isSmallScreen ? 90 : 120,
                height: isSmallScreen ? 90 : 120,
                borderRadius: isSmallScreen ? 45 : 60,
                marginBottom: isSmallScreen ? 12 : 20
              }
            ]}>
              <Ionicons 
                name="time" 
                size={isSmallScreen ? 45 : 60} 
                color={PRIMARY_COLOR} 
              />
            </View>
            <Text style={[styles.cardTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>
              Billing History
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
  },
  header: {
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  verticalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LIGHT_ACCENT,
  },
  cardTitle: {
    fontWeight: '600',
    color: PRIMARY_COLOR,
    textAlign: 'center',
  },
});