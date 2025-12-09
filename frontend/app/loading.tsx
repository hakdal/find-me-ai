import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LoadingScreen() {
  const [loadingText, setLoadingText] = useState('Personan hazırlanıyor...');
  const pulseAnim = new Animated.Value(1);
  const spinAnim = new Animated.Value(0);
  const router = useRouter();

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    generatePersona();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const generatePersona = async () => {
    try {
      setLoadingText('Selfien analiz ediliyor...');
      
      // Get stored data
      const selfie = await AsyncStorage.getItem('selfie');
      const quizAnswersStr = await AsyncStorage.getItem('quizAnswers');
      const selectedPersona = await AsyncStorage.getItem('selectedPersona');

      if (!selfie || !quizAnswersStr || !selectedPersona) {
        console.error('Missing data');
        router.replace('/');
        return;
      }

      const quizAnswers = JSON.parse(quizAnswersStr);

      setLoadingText('AI senin için çalışıyor...');

      // Call API
      const response = await axios.post(
        `${BACKEND_URL}/api/generate-persona`,
        {
          selfie_base64: selfie,
          quiz_answers: quizAnswers,
          persona_theme: selectedPersona,
        },
        {
          timeout: 120000, // 2 minute timeout
        }
      );

      setLoadingText('Avatar oluşturuluyor...');

      if (response.data && response.data.id) {
        // Success! Navigate to results
        setTimeout(() => {
          router.replace(`/results/${response.data.id}`);
        }, 1000);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('Error generating persona:', error);
      setLoadingText('Bir hata oluştu, tekrar denenecek...');
      
      // Retry after 2 seconds
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[
          Colors.background,
          Colors.gradient1,
          Colors.gradient2,
          Colors.background,
        ]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.glowContainer,
              {
                transform: [{ scale: pulseAnim }, { rotate: spin }],
              },
            ]}
          >
            <View style={styles.outerRing} />
            <View style={styles.middleRing} />
            <View style={styles.innerCircle}>
              <Text style={styles.sparkle}>✨</Text>
            </View>
          </Animated.View>

          <Text style={styles.loadingText}>{loadingText}</Text>
          <Text style={styles.subText}>
            Bu birkaç saniye sürebilir
          </Text>
        </View>
      </LinearGradient>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glowContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.secondary,
    opacity: 0.3,
  },
  middleRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.5,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    fontSize: 48,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
