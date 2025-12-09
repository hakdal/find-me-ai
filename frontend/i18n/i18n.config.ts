import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import tr from './locales/tr.json';

const LANGUAGE_KEY = 'user_language';

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  
  if (!savedLanguage) {
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    savedLanguage = deviceLanguage === 'tr' ? 'tr' : 'en';
  }

  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  i18n.changeLanguage(lang);
};

export default i18n;
