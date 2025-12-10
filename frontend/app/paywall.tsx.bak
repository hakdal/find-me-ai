import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { analyticsService } from '../services/analytics';
import { useTranslation } from 'react-i18next';

// Product IDs
const PRODUCT_IDS = {
  PERSONA_SINGLE: 'persona_single',
  PERSONA_ALL: 'persona_all',
};

const SUBSCRIPTION_IDS = {
  PERSONA_UNLIMITED: 'persona_unlimited',
};

export default function PaywallScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    analyticsService.logPaywallView('modal');
    setLoading(false);
  }, []);

  const products = [
    {
      id: PRODUCT_IDS.PERSONA_SINGLE,
      name: 'Single Persona',
      price: '$1.99',
      priceTR: '₺79',
      description: 'Unlock one additional persona',
      icon: '🎭',
    },
    {
      id: PRODUCT_IDS.PERSONA_ALL,
      name: 'All Personas',
      price: '$6.99',
      priceTR: '₺299',
      description: 'Unlock all 10 personas forever',
      icon: '🌟',
      popular: true,
    },
    {
      id: SUBSCRIPTION_IDS.PERSONA_UNLIMITED,
      name: 'Unlimited',
      price: '$4.99/mo',
      priceTR: '₺149/mo',
      description: 'Unlimited personas + HD downloads',
      icon: '👑',
    },
  ];

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(true);
      analyticsService.logPurchaseAttempt(productId);

      if (Platform.OS === 'web') {
        // Web platform - show message
        Alert.alert(
          'Not Available on Web',
          'In-app purchases are only available on mobile devices. Please use the mobile app.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Native platforms - use IAP
      const { iapService } = await import('../services/iap');
      await iapService.purchaseProduct(productId);

      // Success handled by IAP listener
      Alert.alert(
        'Success! 🎉',
        'Your purchase was successful. Enjoy unlimited access!',
        [
          {
            text: 'Continue',
            onPress: () => router.back(),
          },
        ]
      );

      analyticsService.logPurchaseSuccess(productId, 1.99, 'USD');
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.background, '#1a0a2e', Colors.background]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
            <Text style={styles.heroSubtitle}>
              Get unlimited access to all personas and features
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="infinite" text="Unlimited personas" />
            <FeatureItem icon="download" text="HD downloads" />
            <FeatureItem icon="share-social" text="Premium share cards" />
            <FeatureItem icon="sparkles" text="Priority AI generation" />
          </View>

          {/* Products */}
          <View style={styles.products}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  selectedProduct === product.id && styles.productCardSelected,
                  product.popular && styles.productCardPopular,
                ]}
                onPress={() => setSelectedProduct(product.id)}
                activeOpacity={0.8}
              >
                {product.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <Text style={styles.productIcon}>{product.icon}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.priceTR}</Text>
                <Text style={styles.productPriceUSD}>{product.price}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
                {selectedProduct === product.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              (!selectedProduct || purchasing) && styles.purchaseButtonDisabled,
            ]}
            onPress={() => selectedProduct && handlePurchase(selectedProduct)}
            disabled={!selectedProduct || purchasing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                selectedProduct && !purchasing
                  ? [Colors.primary, Colors.gradient2]
                  : ['#333', '#222']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.purchaseGradient}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="cart" size={24} color={Colors.text} />
                  <Text style={styles.purchaseText}>
                    {selectedProduct ? 'Purchase Now' : 'Select a Plan'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            Secure payment powered by Google Play
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={Colors.secondary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  products: {
    gap: 16,
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  productCardSelected: {
    borderColor: Colors.success,
    backgroundColor: Colors.surface,
  },
  productCardPopular: {
    borderColor: Colors.accent,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: 1,
  },
  productIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 4,
  },
  productPriceUSD: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  purchaseButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  purchaseText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  footer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
