import { useTranslation as useI18nextTranslation } from 'react-i18next'

export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nextTranslation(namespace)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLanguage = i18n.language

  return {
    t,
    changeLanguage,
    currentLanguage,
    isLoaded: i18n.isInitialized,
  }
}

export default useTranslation
