// App.js
import { TranslationProvider, useTranslation } from './components/common/i18n/i18n';
import { ThemeProvider } from './components/common/Theme/ThemeContext';
import AppContent from './components/AppContent';
import './styles/global.css';

function App() {
// Automatic system language detection
const browserLang = navigator.language || navigator.userLanguage;
const langCode = browserLang.split('-')[0];

const locale = localStorage.getItem('language') || 'enGB';

const {availableLanguages } = useTranslation();

// If the detected language is not supported, we set language by default
const defaultLang = availableLanguages.includes(langCode) ? langCode : locale;
localStorage.setItem('language', defaultLang);

  return (
    <ThemeProvider>
      <TranslationProvider defaultLanguage={defaultLang}>
        <AppContent />
      </TranslationProvider>
    </ThemeProvider>
  );
}

export default App;
