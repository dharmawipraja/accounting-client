import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from './locales/en.json'
import id from './locales/id.json'

const resources = {
  en: {
    translation: en,
  },
  id: {
    translation: id,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'id', // Default to Indonesian
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
