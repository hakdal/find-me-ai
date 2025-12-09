import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { QUIZ_QUESTIONS, QuizQuestion } from '../constants/Quiz';
import { PERSONA_THEMES } from '../constants/Personas';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function QuizScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const router = useRouter();

  const isQuizComplete = currentQuestion === QUIZ_QUESTIONS.length && selectedPersona !== null;
  const progress = selectedPersona
    ? 1
    : (currentQuestion / QUIZ_QUESTIONS.length);

  const selectAnswer = (answer: string) => {
    const newAnswers = { ...answers, [currentQuestion + 1]: answer };
    setAnswers(newAnswers);

    // Move to next question or persona selection
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      // Quiz complete, show persona selection
      setTimeout(() => {
        setCurrentQuestion(QUIZ_QUESTIONS.length);
      }, 300);
    }
  };

  const selectPersonaTheme = (personaName: string) => {
    setSelectedPersona(personaName);
  };

  const generatePersona = async () => {
    if (!selectedPersona) return;

    try {
      // Save quiz data
      const quizAnswers = Object.entries(answers).map(([id, answer]) => ({
        question_id: parseInt(id),
        answer,
      }));

      await AsyncStorage.setItem('quizAnswers', JSON.stringify(quizAnswers));
      await AsyncStorage.setItem('selectedPersona', selectedPersona);

      // Navigate to loading screen
      router.push('/loading');
    } catch (error) {
      console.error('Error saving quiz data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.background, '#1a0a2e', Colors.background]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {selectedPersona ? '5/5' : `${currentQuestion + 1}/5`}
            </Text>
          </View>
        </View>

        {/* Content */}
        {currentQuestion < QUIZ_QUESTIONS.length ? (
          <View style={styles.questionContainer}>
            <Text style={styles.questionNumber}>
              Soru {currentQuestion + 1}
            </Text>
            <Text style={styles.question}>
              {QUIZ_QUESTIONS[currentQuestion].question}
            </Text>
            <View style={styles.optionsContainer}>
              {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    answers[currentQuestion + 1] === option && styles.optionSelected,
                  ]}
                  onPress={() => selectAnswer(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers[currentQuestion + 1] === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView style={styles.personaContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.personaTitle}>Persona Seç</Text>
            <Text style={styles.personaSubtitle}>
              Hangi alter ego kişiliğini keşfetmek istersin?
            </Text>
            <View style={styles.personaGrid}>
              {PERSONA_THEMES.map((persona) => (
                <TouchableOpacity
                  key={persona.id}
                  style={[
                    styles.personaCard,
                    selectedPersona === persona.name && styles.personaCardSelected,
                  ]}
                  onPress={() => selectPersonaTheme(persona.name)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={persona.gradient}
                    style={styles.personaGradient}
                  >
                    <Text style={styles.personaEmoji}>{persona.emoji}</Text>
                    <Text style={styles.personaName}>{persona.name}</Text>
                    <Text style={styles.personaDescription}>{persona.description}</Text>
                    {selectedPersona === persona.name && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            {selectedPersona && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generatePersona}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.gradient2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.generateGradient}
                >
                  <Text style={styles.generateText}>Personamı Oluştur</Text>
                  <Ionicons name="sparkles" size={24} color={Colors.text} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
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
  header: {
    flexDirection: 'row',
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
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  questionNumber: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 40,
    lineHeight: 38,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: Colors.surfaceLight,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.surface,
  },
  optionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.text,
    fontWeight: '600',
  },
  personaContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  personaTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 20,
  },
  personaSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  personaGrid: {
    gap: 16,
    paddingBottom: 100,
  },
  personaCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personaCardSelected: {
    borderColor: Colors.success,
  },
  personaGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
  },
  personaEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  personaName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  personaDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  generateButton: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  generateText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 12,
  },
});
