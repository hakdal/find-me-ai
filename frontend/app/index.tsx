import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.background, '#1a0a2e', Colors.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo/Title */}
          <View style={styles.header}>
            <Text style={styles.logo}>🔮</Text>
            <Text style={styles.title}>FIND ME AI</Text>
            <Text style={styles.subtitle}>Gerçek Kişiliğini Keşfet</Text>
          </View>

          {/* Main Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Selfie + 5 Soru = Senin Alter Ego Personan
            </Text>
            <Text style={styles.descriptionSmall}>
              AI tabanlı kişilik analizi ve avatar oluşturma
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="camera" text="Selfie Çek" />
            <FeatureItem icon="help-circle" text="5 Soru Cevapla" />
            <FeatureItem icon="sparkles" text="AI Personan" />
            <FeatureItem icon="share-social" text="Paylaş" />
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/camera')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Başlat</Text>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color={Colors.secondary} />
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-evenly',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  description: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 30,
  },
  descriptionSmall: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  ctaText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 12,
    letterSpacing: 1,
  },
});
