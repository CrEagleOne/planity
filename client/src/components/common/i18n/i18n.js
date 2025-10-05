import React, { createContext, useContext, useState, useEffect } from 'react';
import { fr as dateFnsFr, enGB as dateFnsEnGB, es as dateFnsEs, de as dateFnsDe, it as dateFnsIt } from 'date-fns/locale';
import { registerLocale } from 'react-datepicker';
// Import des traductions
import fr from './locale/fr';
import enGB from './locale/enGB';
import es from './locale/es';
import de from './locale/de';
import it from './locale/it';

const localeMap = {
  fr: dateFnsFr,
  enGB: dateFnsEnGB,
  es: dateFnsEs,
  de: dateFnsDe,
  it: dateFnsIt,
};

const allTranslations = {
  fr,
  enGB,
  es,
  de,
  it
};

const TranslationContext = createContext({
  language: 'enGB',
  setLanguage: () => {},
  t: (key) => key,
  availableLanguages: ['enGB', 'fr', 'es', 'de', 'it'],
  currentLocale: dateFnsEnGB
});

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState('enGB');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    localStorage.setItem('locale', localeMap[language]);
  }, [language]);

  const t = (key) => {
    const translations = allTranslations[language] || allTranslations.enGB;
    return translations[key] || key;
  };

  const currentLocale = () => {
    const storedLang = localStorage.getItem('language') || 'enGB';
    const selectedLocale = localeMap[storedLang] || dateFnsEnGB;
    registerLocale(storedLang, selectedLocale);
    return selectedLocale;
  };

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages: ['enGB', 'fr', 'es', 'de', 'it'],
        currentLocale
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
