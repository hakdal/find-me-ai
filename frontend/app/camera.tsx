import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Similarity level options
const SIMILARITY_LEVELS = [
  { id: 'realistic', label: '%100 Benzeme', icon: 'person', description: 'Sana en çok benzeyen avatar', recommended: true },
  { id: 'stylized', label: 'Stilize', icon: 'color-palette', description: 'Sanatsal yorumlama' },
  { id: 'creative', label: 'Yaratıcı', icon: 'sparkles', description: 'Tamamen yaratıcı' },
];

// Gender options
const GENDER_OPTIONS = [
  { id: 'female', label: 'Kadın', icon: 'female' },
  { id: 'male', label: 'Erkek', icon: 'male' },
  { id: 'auto', label: 'Otomatik Algıla', icon: 'scan' },
];

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoMode, setPhotoMode] = useState<'single' | 'multi'>('multi'); // Default multi
  const [similarityLevel, setSimilarityLevel] = useState('realistic');
  const [userGender, setUserGender] = useState<string>('auto'); // 'female', 'male', or 'auto'
  const [showSettings, setShowSettings] = useState(false);
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  const PHOTO_GUIDES = [
    { angle: 'Önden', instruction: 'Düz bakın', icon: 'person' },
    { angle: '45° Sağ', instruction: 'Hafif sağa dönün', icon: 'arrow-forward' },
    { angle: '45° Sol', instruction: 'Hafif sola dönün', icon: 'arrow-back' },
  ];

  const requiredPhotos = photoMode === 'multi' ? 3 : 1;

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={80} color={Colors.textMuted} />
          <Text style={styles.permissionText}>Kamera erişimi gerekli</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, styles.galleryButton]}
            onPress={pickImage}
          >
            <Text style={styles.permissionButtonText}>Galeriden Seç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        const newImages = [...capturedImages, photo.base64];
        setCapturedImages(newImages);
        
        if (newImages.length < requiredPhotos) {
          setCurrentPhotoIndex(newImages.length);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const newImages = [...capturedImages, result.assets[0].base64];
        setCapturedImages(newImages);
        
        if (newImages.length < requiredPhotos) {
          setCurrentPhotoIndex(newImages.length);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu');
    }
  };

  const continueToQuiz = async () => {
    if (capturedImages.length > 0) {
      try {
        // Save all images and settings
        await AsyncStorage.setItem('selfie', capturedImages[0]); // Primary selfie
        await AsyncStorage.setItem('selfie_all', JSON.stringify(capturedImages));
        await AsyncStorage.setItem('similarity_level', similarityLevel);
        await AsyncStorage.setItem('photo_mode', photoMode);
        router.push('/quiz');
      } catch (error) {
        console.error('Error saving selfie:', error);
        Alert.alert('Hata', 'Fotoğraf kaydedilirken bir hata oluştu');
      }
    }
  };

  const retakeAll = () => {
    setCapturedImages([]);
    setCurrentPhotoIndex(0);
  };

  const retakePhoto = (index: number) => {
    const newImages = capturedImages.filter((_, i) => i !== index);
    setCapturedImages(newImages);
    setCurrentPhotoIndex(index);
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Preview Screen - All photos taken
  if (capturedImages.length >= requiredPhotos) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
          {/* Header */}
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={retakeAll}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>Fotoğraflar Hazır</Text>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Photos Grid */}
          <View style={styles.photosGrid}>
            {capturedImages.map((img, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: `data:image/jpeg;base64,${img}` }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoRetake} onPress={() => retakePhoto(index)}>
                  <Ionicons name="refresh" size={16} color={Colors.text} />
                </TouchableOpacity>
                {photoMode === 'multi' && (
                  <Text style={styles.photoLabel}>{PHOTO_GUIDES[index]?.angle}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Similarity Level */}
          <View style={styles.similaritySection}>
            <Text style={styles.sectionTitle}>🎨 Avatar Stili</Text>
            <View style={styles.similarityOptions}>
              {SIMILARITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.similarityOption,
                    similarityLevel === level.id && styles.similarityOptionActive,
                  ]}
                  onPress={() => setSimilarityLevel(level.id)}
                >
                  <Ionicons
                    name={level.icon as any}
                    size={24}
                    color={similarityLevel === level.id ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.similarityLabel,
                    similarityLevel === level.id && styles.similarityLabelActive,
                  ]}>
                    {level.label}
                  </Text>
                  {level.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Önerilen</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsBox}>
            <Ionicons name="information-circle" size={20} color={Colors.secondary} />
            <Text style={styles.tipsText}>
              "%100 Benzeme" seçeneği ile AI avatarınız size en çok benzeyen sonucu üretir.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.retakeAllBtn} onPress={retakeAll}>
              <Ionicons name="refresh" size={20} color={Colors.text} />
              <Text style={styles.retakeAllText}>Tümünü Yeniden Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueBtn} onPress={continueToQuiz}>
              <LinearGradient
                colors={[Colors.primary, Colors.gradient2]}
                style={styles.continueBtnGradient}
              >
                <Text style={styles.continueText}>Devam Et</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.text} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Settings Modal */}
        <Modal visible={showSettings} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Fotoğraf Ayarları</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalLabel}>Fotoğraf Modu</Text>
              <View style={styles.modeOptions}>
                <TouchableOpacity
                  style={[styles.modeOption, photoMode === 'multi' && styles.modeOptionActive]}
                  onPress={() => { setPhotoMode('multi'); retakeAll(); setShowSettings(false); }}
                >
                  <Ionicons name="images" size={24} color={photoMode === 'multi' ? Colors.primary : Colors.textSecondary} />
                  <Text style={styles.modeText}>3 Fotoğraf (Önerilen)</Text>
                  <Text style={styles.modeDesc}>Daha iyi benzerlik</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeOption, photoMode === 'single' && styles.modeOptionActive]}
                  onPress={() => { setPhotoMode('single'); retakeAll(); setShowSettings(false); }}
                >
                  <Ionicons name="camera" size={24} color={photoMode === 'single' ? Colors.primary : Colors.textSecondary} />
                  <Text style={styles.modeText}>1 Fotoğraf (Hızlı)</Text>
                  <Text style={styles.modeDesc}>Daha hızlı sonuç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Camera Screen
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {photoMode === 'multi' ? PHOTO_GUIDES[currentPhotoIndex]?.angle : 'Selfie Çek'}
              </Text>
              {photoMode === 'multi' && (
                <Text style={styles.headerSubtitle}>{currentPhotoIndex + 1} / {requiredPhotos}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Photo Tips Box */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Ionicons name="sunny" size={16} color={Colors.secondary} />
              <Text style={styles.tipText}>İyi ışık</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="person" size={16} color={Colors.secondary} />
              <Text style={styles.tipText}>Tek kişi</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="eye" size={16} color={Colors.secondary} />
              <Text style={styles.tipText}>Yüz net</Text>
            </View>
          </View>

          {/* Guide */}
          <View style={styles.guideContainer}>
            <View style={styles.guideFrame} />
            <Text style={styles.guideText}>
              {photoMode === 'multi' 
                ? PHOTO_GUIDES[currentPhotoIndex]?.instruction 
                : 'Yüzünü çerçeveye hizala'}
            </Text>
          </View>

          {/* Progress Dots (for multi mode) */}
          {photoMode === 'multi' && (
            <View style={styles.progressDots}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < capturedImages.length && styles.dotCompleted,
                    i === currentPhotoIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton2} onPress={pickImage}>
              <Ionicons name="images" size={28} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modeButton} 
              onPress={() => {
                setPhotoMode(photoMode === 'single' ? 'multi' : 'single');
                retakeAll();
              }}
            >
              <Ionicons 
                name={photoMode === 'multi' ? 'images' : 'camera'} 
                size={24} 
                color={Colors.text} 
              />
              <Text style={styles.modeButtonText}>
                {photoMode === 'multi' ? '3x' : '1x'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  headerSubtitle: { fontSize: 14, color: Colors.secondary, marginTop: 4 },
  flipButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  
  tipsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.5)', marginHorizontal: 20, borderRadius: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { fontSize: 12, color: Colors.text },
  
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideFrame: { width: 280, height: 360, borderRadius: 140, borderWidth: 3, borderColor: Colors.secondary, borderStyle: 'dashed' },
  guideText: { marginTop: 24, fontSize: 16, color: Colors.text, textAlign: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotCompleted: { backgroundColor: Colors.primary },
  dotActive: { backgroundColor: Colors.secondary, transform: [{ scale: 1.2 }] },
  
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  galleryButton2: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.text, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: Colors.secondary },
  captureButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary },
  modeButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modeButtonText: { fontSize: 10, color: Colors.text, fontWeight: '700', marginTop: 2 },
  
  // Preview styles
  previewScroll: { flex: 1 },
  previewScrollContent: { padding: 20, paddingTop: 50 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  previewHeaderTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  
  photosGrid: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  photoItem: { alignItems: 'center' },
  photoThumb: { width: (width - 80) / 3, height: ((width - 80) / 3) * 1.3, borderRadius: 12, backgroundColor: Colors.surface },
  photoRetake: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  photoLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  
  similaritySection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  similarityOptions: { gap: 12 },
  similarityOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.surfaceLight, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', gap: 12 },
  similarityOptionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,51,102,0.1)' },
  similarityLabel: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  similarityLabelActive: { color: Colors.primary },
  recommendedBadge: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recommendedText: { fontSize: 10, fontWeight: '700', color: Colors.text },
  
  tipsBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(0,255,255,0.1)', borderRadius: 12, marginBottom: 24 },
  tipsText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  
  previewActions: { gap: 12 },
  retakeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: Colors.surfaceLight, borderRadius: 25, gap: 8 },
  retakeAllText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  continueBtn: { borderRadius: 25, overflow: 'hidden' },
  continueBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 8 },
  continueText: { fontSize: 18, fontWeight: '700', color: Colors.text },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  modeOptions: { gap: 12 },
  modeOption: { padding: 16, backgroundColor: Colors.surfaceLight, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', gap: 4 },
  modeOptionActive: { borderColor: Colors.primary },
  modeText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  modeDesc: { fontSize: 12, color: Colors.textSecondary },
  
  // Permission styles
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center', marginTop: 20, marginBottom: 32 },
  permissionButton: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 25, marginBottom: 12, width: '80%' },
  permissionButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  galleryButton: { backgroundColor: Colors.surfaceLight },
});
