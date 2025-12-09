import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Share,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { analyticsService } from '../../services/analytics';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PersonaData {
  id: string;
  persona_name: string;
  bio_paragraph: string;
  traits: string[];
  share_quote: string;
  avatar_base64: string;
  persona_theme: string;
  created_at: string;
}

export default function ResultsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCard, setGeneratingCard] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPersona();
    analyticsService.logScreenView('results');
  }, [id]);

  const fetchPersona = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/personas/${id}`);
      setPersona(response.data);
    } catch (error) {
      console.error('Error fetching persona:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!persona) return;

    try {
      await Share.share({
        message: `🔮 ${persona.persona_name}\n\n${persona.share_quote}\n\nFIND ME AI ile senin de alter ego personanı keşfet! 🚀`,
      });
      
      analyticsService.logShareAction(persona.id, 'native');
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const generateAndShareCard = async () => {
    if (!persona) return;

    try {
      setGeneratingCard(true);
      
      // Generate share card from backend
      const response = await axios.post(`${BACKEND_URL}/api/generate-share-card`, {
        persona_id: persona.id,
      });

      if (response.data && response.data.share_card_base64) {
        // Save to device
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status === 'granted') {
          // Save base64 image to file
          const fileUri = FileSystem.documentDirectory + `share_card_${persona.id}.png`;
          await FileSystem.writeAsStringAsync(
            fileUri,
            response.data.share_card_base64,
            { encoding: FileSystem.EncodingType.Base64 }
          );

          // Save to gallery
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('Find Me AI', asset, false);

          Alert.alert(
            'Success! 🎉',
            'Share card saved to your gallery. You can now share it on Instagram or TikTok!',
            [{ text: 'OK' }]
          );

          analyticsService.logShareAction(persona.id, 'card_download');
        } else {
          Alert.alert('Permission Required', 'Please grant permission to save images');
        }
      }
    } catch (error) {
      console.error('Error generating share card:', error);
      Alert.alert('Error', 'Failed to generate share card. Please try again.');
    } finally {
      setGeneratingCard(false);
    }
  };

  const createAnother = () => {
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('results.loading')}</Text>
      </View>
    );
  }

  if (!persona) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{t('results.notFound')}</Text>
        <TouchableOpacity style={styles.homeButton} onPress={createAnother}>
          <Text style={styles.homeButtonText}>{t('results.backHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={createAnother}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{persona.persona_theme}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            style={styles.avatarGradient}
          >
            <Image
              source={{ uri: `data:image/png;base64,${persona.avatar_base64}` }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </LinearGradient>
        </View>

        {/* Persona Name */}
        <Text style={styles.personaName}>{persona.persona_name}</Text>

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioLabel}>{t('results.analysis')}</Text>
          <Text style={styles.bioText}>{persona.bio_paragraph}</Text>
        </View>

        {/* Traits */}
        <View style={styles.traitsContainer}>
          <Text style={styles.traitsLabel}>{t('results.traits')}</Text>
          {persona.traits.map((trait, index) => (
            <View key={index} style={styles.traitItem}>
              <LinearGradient
                colors={[Colors.primary, Colors.gradient2]}
                style={styles.traitDot}
              />
              <Text style={styles.traitText}>{trait}</Text>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <LinearGradient
            colors={[Colors.surfaceLight, Colors.surface]}
            style={styles.quoteGradient}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={32}
              color={Colors.secondary}
              style={styles.quoteIcon}
            />
            <Text style={styles.quoteText}>"{persona.share_quote}"</Text>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Share Card Button */}
          <TouchableOpacity
            style={styles.shareCardButton}
            onPress={generateAndShareCard}
            disabled={generatingCard}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.secondary, '#00AAAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareCardGradient}
            >
              {generatingCard ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="download" size={24} color={Colors.text} />
                  <Text style={styles.shareCardText}>Download Share Card</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButtonLarge}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareGradient}
            >
              <Ionicons name="share-social" size={24} color={Colors.text} />
              <Text style={styles.shareButtonText}>{t('results.share')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Create Another Button */}
          <TouchableOpacity
            style={styles.createAnotherButton}
            onPress={createAnother}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color={Colors.text} />
            <Text style={styles.createAnotherText}>{t('results.createAnother')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarGradient: {
    padding: 4,
    borderRadius: 120,
  },
  avatar: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.surface,
  },
  personaName: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  bioContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bioText: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  traitsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  traitsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  traitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  traitText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  quoteContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  quoteGradient: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 18,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 28,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 16,
  },
  shareCardButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  shareCardText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  shareButtonLarge: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  createAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  createAnotherText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  homeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
