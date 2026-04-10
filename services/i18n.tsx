import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppLanguage, AppTexts, getTexts, LANGUAGE_STORAGE_KEY } from '../constants/texts';

interface LanguageContextValue {
  language: AppLanguage;
  locale: string;
  texts: AppTexts;
  setLanguage: (language: AppLanguage) => void;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}

const localeMap: Record<AppLanguage, string> = {
  nl: 'nl-NL',
  en: 'en-US',
};

const defaultLanguage: AppLanguage = 'nl';

const formatText = (value: string, replacements?: Record<string, string | number>) => {
  if (!replacements) return value;

  return Object.entries(replacements).reduce((result, [key, replacement]) => {
    return result.replaceAll(`{${key}}`, String(replacement));
  }, value);
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null;
    if (storedLanguage === 'nl' || storedLanguage === 'en') {
      setLanguageState(storedLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = localeMap[language];
  }, [language]);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(() => {
    const texts = getTexts(language);

    return {
      language,
      locale: localeMap[language],
      texts,
      setLanguage,
      translate: (text, replacements) => formatText(text, replacements),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};

export const useTexts = () => useLanguage().texts;
