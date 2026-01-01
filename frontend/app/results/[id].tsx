import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
  Modal,
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
import i18n from 'i18next';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://alter-ego-app-1.preview.emergentagent.com';

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

// Persona titles and levels
const LEVEL_NAMES: Record<number, string> = {
  1: 'Çaylak', 2: 'Acemi', 3: 'Öğrenci', 4: 'Aday',
  5: 'Yetkin', 6: 'Uzman', 7: 'Usta', 8: 'Virtuoso',
  9: 'Efsane', 10: 'Grandmaster', 11: 'Mythic', 12: 'Tanrısal'
};

const PERSONA_TITLES: Record<string, { title: string; level: number; maxLevel: number }> = {
  'Midnight CEO': { title: 'Gölgelerin Lideri', level: 9, maxLevel: 12 },
  'Dark Charmer': { title: 'Büyülü Karizmatik', level: 8, maxLevel: 12 },
  'Alpha Strategist': { title: 'Strateji Ustası', level: 10, maxLevel: 12 },
  'Glam Diva': { title: 'Işıltının Kraliçesi', level: 7, maxLevel: 12 },
};

// Stat descriptions for tooltip
const STAT_INFO: Record<string, string> = {
  'Liderlik': 'Quiz cevaplarına göre karar verme ve yönlendirme yeteneğiniz',
  'Empati': 'Duygusal zeka ve başkalarını anlama kapasiteniz',
  'Risk Alma': 'Cesaret ve yenilikçi düşünme eğiliminiz',
};

// Stat bar component with tooltip
const StatBar = ({ 
  label, 
  value, 
  color, 
  delay,
  onInfoPress 
}: { 
  label: string; 
  value: number; 
  color: string; 
  delay: number;
  onInfoPress: () => void;
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value,
      duration: 1000,
      delay: delay,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthInterpolate = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.statContainer}>
      <View style={styles.statHeader}>
        <View style={styles.statLabelRow}>
          <Text style={styles.statLabel}>{label}</Text>
          <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="help-circle-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.statValue}>{value}%</Text>
      </View>
      <View style={styles.statBarBg}>
        <Animated.View style={[styles.statBarFill, { width: widthInterpolate, backgroundColor: color }]} />
      </View>
    </View>
  );
};

export default function ResultsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingShareCard, setGeneratingShareCard] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [showStatInfo, setShowStatInfo] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const router = useRouter();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchPersona();
  }, [id]);

  useEffect(() => {
    if (persona) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [persona]);

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

  const generateStats = () => {
    if (!persona) return { leadership: 50, empathy: 50, risk: 50 };
    const hash = persona.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return {
      leadership: 60 + (Math.abs(hash) % 35),
      empathy: 55 + (Math.abs(hash >> 4) % 40),
      risk: 50 + (Math.abs(hash >> 8) % 45),
    };
  };

  const stats = generateStats();
  const personaTitle = PERSONA_TITLES[persona?.persona_theme || ''] || { title: 'Gizemli Ruh', level: 7, maxLevel: 12 };
  const levelName = LEVEL_NAMES[personaTitle.level] || 'Usta';

  // Save avatar to gallery
  const saveAvatarToGallery = async () => {
    if (!persona) return;
    setSavingAvatar(true);
    try {
      const fileUri = FileSystem.documentDirectory + `findmeai_avatar_${persona.id}.png`;
      await FileSystem.writeAsStringAsync(fileUri, persona.avatar_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        Alert.alert('✅ Başarılı', 'Avatar galeriye kaydedildi!');
      } else {
        Alert.alert('İzin Gerekli', 'Galeriye kaydetmek için izin verin.');
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      Alert.alert('Hata', 'Avatar kaydedilemedi.');
    } finally {
      setSavingAvatar(false);
    }
  };

  // Generate and save story card
  const generateAndSaveStoryCard = async () => {
    if (!persona) return;
    setGeneratingShareCard(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/generate-share-card`, {
        persona_id: persona.id,
      });

      if (response.data && response.data.share_card_base64) {
        const fileUri = FileSystem.documentDirectory + `findmeai_story_${persona.id}.png`;
        await FileSystem.writeAsStringAsync(fileUri, response.data.share_card_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(fileUri);
          Alert.alert('✅ Başarılı', 'Story kartı galeriye kaydedildi!');
        }
        return fileUri;
      }
    } catch (error) {
      console.error('Error generating story card:', error);
      Alert.alert('Hata', 'Story kartı oluşturulamadı.');
    } finally {
      setGeneratingShareCard(false);
    }
    return null;
  };

  // Share to specific platform
  const shareToInstagram = async () => {
    setShowShareSheet(false);
    const fileUri = await generateAndSaveStoryCard();
    if (fileUri) {
      Alert.alert(
        '📸 Instagram Story',
        'Story kartı galeriye kaydedildi. Instagram\'ı açıp Story oluşturabilirsiniz.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const shareToWhatsApp = async () => {
    setShowShareSheet(false);
    if (!persona) return;
    
    const message = `🔮 ${persona.persona_name} — ${personaTitle.title}\n\n"${persona.share_quote}"\n\nFIND ME AI ile senin de alter ego personanı keşfet! 🚀`;
    
    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const shareGeneral = async () => {
    setShowShareSheet(false);
    if (!persona) return;
    
    try {
      const fileUri = FileSystem.documentDirectory + `findmeai_share_${persona.id}.png`;
      await FileSystem.writeAsStringAsync(fileUri, persona.avatar_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Personanı Paylaş',
        });
      } else {
        await Share.share({
          message: `🔮 ${persona.persona_name} — ${personaTitle.title}\n\n"${persona.share_quote}"`,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const selfie = await AsyncStorage.getItem('selfie');
      const quizAnswersStr = await AsyncStorage.getItem('quiz_answers');
      const selectedPersona = await AsyncStorage.getItem('selected_persona');
      const similarityLevel = await AsyncStorage.getItem('similarity_level') || 'realistic';
      const userGender = await AsyncStorage.getItem('user_gender') || null;
      const additionalPhotosStr = await AsyncStorage.getItem('selfie_all');
      
      if (!selfie || !quizAnswersStr || !selectedPersona) {
        router.replace('/camera');
        return;
      }

      const quizAnswers = JSON.parse(quizAnswersStr);
      let additionalPhotos: string[] = [];
      if (additionalPhotosStr) {
        try { additionalPhotos = JSON.parse(additionalPhotosStr); } catch (e) {}
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/generate-persona`,
        {
          selfie_base64: selfie,
          quiz_answers: quizAnswers,
          persona_theme: selectedPersona,
          language: i18n.language,
          similarity_level: similarityLevel,
          additional_photos: additionalPhotos.length > 1 ? additionalPhotos : null,
          user_gender: userGender || null,
        },
        { timeout: 120000 }
      );

      if (response.data && response.data.id) {
        router.replace(`/results/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error regenerating:', error);
      Alert.alert('Hata', 'Yeniden üretim başarısız. Lütfen tekrar deneyin.');
    } finally {
      setRegenerating(false);
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={createAnother}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.levelBadge} onPress={() => setShowLevelInfo(true)}>
            <Text style={styles.levelText}>Seviye {personaTitle.level} ({levelName})</Text>
            <Ionicons name="information-circle-outline" size={16} color="#CC99FF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          
          <View style={{ width: 44 }} />
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Avatar with glow + Save button */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              <LinearGradient colors={[Colors.primary, Colors.gradient2, Colors.secondary]} style={styles.avatarGradient}>
                <Image source={{ uri: `data:image/png;base64,${persona.avatar_base64}` }} style={styles.avatar} resizeMode="cover" />
              </LinearGradient>
            </View>
            
            {/* Save Avatar Button */}
            <TouchableOpacity 
              style={styles.saveAvatarBtn} 
              onPress={saveAvatarToGallery}
              disabled={savingAvatar}
            >
              {savingAvatar ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={Colors.text} />
                  <Text style={styles.saveAvatarText}>Avatarı Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Persona Name + Title */}
          <View style={styles.nameContainer}>
            <Text style={styles.personaName}>{persona.persona_name}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.personaTitle}>{personaTitle.title}</Text>
              <View style={styles.themeBadge}>
                <Text style={styles.themeText}>{persona.persona_theme}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>KİŞİLİK ANALİZİ</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Stats Bars with tooltips */}
          <View style={styles.statsSection}>
            <StatBar 
              label="Liderlik" 
              value={stats.leadership} 
              color="#FF3366" 
              delay={200} 
              onInfoPress={() => setShowStatInfo('Liderlik')}
            />
            <StatBar 
              label="Empati" 
              value={stats.empathy} 
              color="#00FFFF" 
              delay={400}
              onInfoPress={() => setShowStatInfo('Empati')}
            />
            <StatBar 
              label="Risk Alma" 
              value={stats.risk} 
              color="#9933FF" 
              delay={600}
              onInfoPress={() => setShowStatInfo('Risk Alma')}
            />
          </View>

          {/* Traits */}
          <View style={styles.traitsContainer}>
            <Text style={styles.sectionTitle}>🔥 ÖZELLİKLER</Text>
            <View style={styles.traitsGrid}>
              {persona.traits.slice(0, 5).map((trait, index) => (
                <View key={index} style={styles.traitChip}>
                  <Text style={styles.traitChipText}>{trait}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Personal Motto Box */}
          <View style={styles.mottoContainer}>
            <LinearGradient colors={['rgba(255,51,102,0.15)', 'rgba(153,51,255,0.15)']} style={styles.mottoGradient}>
              <View style={styles.mottoHeader}>
                <Ionicons name="flame" size={20} color={Colors.primary} />
                <Text style={styles.mottoLabel}>KİŞİSEL MOTTO</Text>
              </View>
              <Text style={styles.mottoText}>"{persona.share_quote}"</Text>
            </LinearGradient>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={styles.sectionTitle}>📖 HİKAYEN</Text>
            <Text style={styles.bioText}>{persona.bio_paragraph}</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Main Share Button */}
          <TouchableOpacity 
            style={styles.mainShareButton} 
            onPress={() => setShowShareSheet(true)} 
            disabled={generatingShareCard} 
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#FF3366', '#FF6B6B', '#FF3366']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mainShareGradient}>
              {generatingShareCard ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="share-social" size={26} color={Colors.text} />
                  <View style={styles.shareTextContainer}>
                    <Text style={styles.mainShareText}>PAYLAŞ</Text>
                    <Text style={styles.shareSubtext}>Instagram, WhatsApp veya Kaydet</Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Regenerate Button */}
          <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerate} disabled={regenerating} activeOpacity={0.8}>
            {regenerating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color={Colors.primary} />
                <Text style={styles.regenerateText}>Beğenmedim → Yeniden Üret</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Create Another - More prominent */}
          <TouchableOpacity style={styles.createAnotherButton} onPress={createAnother} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.surfaceLight, Colors.surface]} style={styles.createAnotherGradient}>
              <Ionicons name="sparkles" size={22} color={Colors.secondary} />
              <Text style={styles.createAnotherText}>Yeni Persona Oluştur</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Enhanced Brand Logo */}
        <View style={styles.bottomLogo}>
          <LinearGradient colors={['rgba(255,51,102,0.3)', 'rgba(153,51,255,0.3)']} style={styles.logoGradient}>
            <Text style={styles.logoText}>FIND ME AI</Text>
            <Text style={styles.logoTagline}>Alter Egonu Keşfet</Text>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Share Bottom Sheet */}
      <Modal visible={showShareSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowShareSheet(false)}>
          <View style={styles.shareSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.shareSheetTitle}>Paylaş</Text>
            
            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={shareToInstagram}>
                <View style={[styles.shareOptionIcon, { backgroundColor: '#E1306C' }]}>
                  <Ionicons name="logo-instagram" size={28} color="white" />
                </View>
                <Text style={styles.shareOptionText}>Instagram Story</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={shareToWhatsApp}>
                <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' }]}>
                  <Ionicons name="logo-whatsapp" size={28} color="white" />
                </View>
                <Text style={styles.shareOptionText}>WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={generateAndSaveStoryCard}>
                <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="image-outline" size={28} color="white" />
                </View>
                <Text style={styles.shareOptionText}>Story Kartı Kaydet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={shareGeneral}>
                <View style={[styles.shareOptionIcon, { backgroundColor: Colors.secondary }]}>
                  <Ionicons name="share-outline" size={28} color="white" />
                </View>
                <Text style={styles.shareOptionText}>Diğer</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.shareSheetCancel} onPress={() => setShowShareSheet(false)}>
              <Text style={styles.shareSheetCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Level Info Bottom Sheet */}
      <Modal visible={showLevelInfo} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLevelInfo(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>🏆 Persona Seviyesi Nedir?</Text>
            
            <View style={styles.sheetContent}>
              <Text style={styles.sheetDescription}>
                Persona seviyesi, alter egonuzun "olgunluk" ve "derinlik" skorudur. Quiz cevaplarınız ve kişilik analizine göre hesaplanır.
              </Text>
              
              <View style={styles.levelExamples}>
                <View style={styles.levelExample}>
                  <Text style={styles.levelNum}>1-4</Text>
                  <Text style={styles.levelDesc}>Başlangıç (Çaylak → Aday)</Text>
                </View>
                <View style={styles.levelExample}>
                  <Text style={styles.levelNum}>5-8</Text>
                  <Text style={styles.levelDesc}>Gelişmiş (Yetkin → Virtuoso)</Text>
                </View>
                <View style={styles.levelExample}>
                  <Text style={styles.levelNum}>9-12</Text>
                  <Text style={styles.levelDesc}>Efsanevi (Efsane → Tanrısal)</Text>
                </View>
              </View>

              <View style={styles.howToIncrease}>
                <Text style={styles.howToTitle}>📈 Nasıl Artırılır?</Text>
                <Text style={styles.howToItem}>• Farklı temaları deneyin</Text>
                <Text style={styles.howToItem}>• Daha detaylı quiz cevapları</Text>
                <Text style={styles.howToItem}>• Kaliteli selfie (3 açı önerilir)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setShowLevelInfo(false)}>
              <Text style={styles.sheetCloseBtnText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stat Info Modal */}
      <Modal visible={!!showStatInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatInfo(null)}>
          <View style={styles.statInfoModal}>
            <Text style={styles.statInfoTitle}>{showStatInfo}</Text>
            <Text style={styles.statInfoDesc}>{STAT_INFO[showStatInfo || ''] || ''}</Text>
            <TouchableOpacity style={styles.statInfoClose} onPress={() => setShowStatInfo(null)}>
              <Text style={styles.statInfoCloseText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(153,51,255,0.3)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(153,51,255,0.5)' },
  levelText: { fontSize: 13, fontWeight: '700', color: '#CC99FF' },
  
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: { alignItems: 'center', position: 'relative' },
  avatarGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: Colors.primary, opacity: 0.2, top: -10 },
  avatarGradient: { padding: 5, borderRadius: 130 },
  avatar: { width: 250, height: 250, borderRadius: 125, backgroundColor: Colors.surface },
  saveAvatarBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: Colors.surfaceLight, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, gap: 8 },
  saveAvatarText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  
  nameContainer: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 24 },
  personaName: { fontSize: 34, fontWeight: '900', color: Colors.text, textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(255,51,102,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  personaTitle: { fontSize: 18, fontWeight: '600', color: Colors.secondary },
  themeBadge: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  themeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  
  divider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { paddingHorizontal: 16, fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 2 },
  
  statsSection: { paddingHorizontal: 24, marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 16, letterSpacing: 1 },
  statContainer: { marginBottom: 16 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  statValue: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  statBarBg: { height: 10, backgroundColor: Colors.surfaceLight, borderRadius: 5, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 5 },
  
  traitsContainer: { paddingHorizontal: 24, marginBottom: 28 },
  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  traitChip: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  traitChipText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  
  mottoContainer: { paddingHorizontal: 24, marginBottom: 28 },
  mottoGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,51,102,0.3)' },
  mottoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mottoLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  mottoText: { fontSize: 20, color: Colors.text, fontStyle: 'italic', lineHeight: 30, fontWeight: '500' },
  
  bioContainer: { paddingHorizontal: 24, marginBottom: 32 },
  bioText: { fontSize: 16, color: Colors.textSecondary, lineHeight: 26 },
  
  actions: { paddingHorizontal: 24, gap: 12 },
  mainShareButton: { borderRadius: 30, overflow: 'hidden', elevation: 12, shadowColor: '#FF3366', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  mainShareGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 32, gap: 16 },
  shareTextContainer: { alignItems: 'flex-start' },
  mainShareText: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: 2 },
  shareSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  regenerateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 25, borderWidth: 2, borderColor: Colors.primary, gap: 8 },
  regenerateText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  
  createAnotherButton: { borderRadius: 25, overflow: 'hidden' },
  createAnotherGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  createAnotherText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  
  bottomLogo: { alignItems: 'center', marginTop: 32, paddingHorizontal: 24 },
  logoGradient: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: Colors.text, letterSpacing: 4 },
  logoTagline: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 20 },
  sheetContent: { gap: 20 },
  sheetDescription: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, textAlign: 'center' },
  levelExamples: { gap: 12 },
  levelExample: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, padding: 12, borderRadius: 12 },
  levelNum: { fontSize: 18, fontWeight: '700', color: Colors.primary, width: 50 },
  levelDesc: { fontSize: 14, color: Colors.text, flex: 1 },
  howToIncrease: { backgroundColor: 'rgba(0,255,255,0.1)', padding: 16, borderRadius: 12 },
  howToTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  howToItem: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },
  sheetCloseBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 25, marginTop: 20 },
  sheetCloseBtnText: { fontSize: 16, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  
  // Share Sheet
  shareSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  shareSheetTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 24 },
  shareOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 16 },
  shareOption: { alignItems: 'center', width: (width - 80) / 4 },
  shareOptionIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shareOptionText: { fontSize: 11, color: Colors.text, textAlign: 'center' },
  shareSheetCancel: { marginTop: 24, paddingVertical: 16, backgroundColor: Colors.surfaceLight, borderRadius: 25 },
  shareSheetCancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  
  // Stat Info Modal
  statInfoModal: { backgroundColor: Colors.surface, marginHorizontal: 40, borderRadius: 20, padding: 24, alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto' },
  statInfoTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  statInfoDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  statInfoClose: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 20, marginTop: 20 },
  statInfoCloseText: { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
  errorContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 18, color: Colors.textSecondary, marginBottom: 24 },
  homeButton: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 25 },
  homeButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text },
});
