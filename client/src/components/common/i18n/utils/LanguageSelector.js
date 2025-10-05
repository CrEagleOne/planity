import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { FiGlobe } from 'react-icons/fi';
import './LanguageSelector.css';
import FranceFlag from 'country-flag-icons/react/3x2/FR';
import UKFlag from 'country-flag-icons/react/3x2/GB';
import SpainFlag from 'country-flag-icons/react/3x2/ES';
import GermanyFlag from 'country-flag-icons/react/3x2/DE';
import ItalyFlag from 'country-flag-icons/react/3x2/IT';

function LanguageSelector({ collapsed = false }) {
  const { setLanguage, language, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Liste des langues disponibles avec composants de drapeau
  const languages = [
    { code: 'fr', name: t('french'), flag: <FranceFlag /> },
    { code: 'enGB', name: t('english'), flag: <UKFlag /> },
    { code: 'es', name: t('spanish'), flag: <SpainFlag /> },
    { code: 'de', name: t('german'), flag: <GermanyFlag /> },
    { code: 'it', name: t('italian'), flag: <ItalyFlag /> }
  ];

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Trouver la langue actuelle
  const currentLang = languages.find(l => l.code === language) || languages[0];

  // Gérer la sélection d'une nouvelle langue
  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div
      className={`language-selector-container ${collapsed ? 'collapsed' : ''} ${isOpen ? 'dropdown-open' : ''}`}
      ref={dropdownRef}
    >
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('languageSelector')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {collapsed ? (
          <span className="language-flag">{currentLang.flag}</span>
        ) : (
          <>
            <span className="language-current-flag">{currentLang.flag}</span>
            <span className="language-current-text">{t(currentLang.name)}</span>
            <FiGlobe className="globe-icon" />
          </>
        )}
      </button>
      {isOpen && (
        <div className={`language-dropdown ${collapsed ? 'collapsed-dropdown' : ''}`}>
          {languages.map(lang => (
            <button
              key={lang.code}
              className={`language-option ${language === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              tabIndex={isOpen ? 0 : -1}
              aria-selected={language === lang.code}
              role="option"
            >
              {collapsed ? (
                <span className="flag">{lang.flag}</span>
              ) : (
                <>
                  <span className="flag">{lang.flag}</span>
                  <span className="lang-name">{t(lang.name)}</span>
                  {language === lang.code && (
                    <span className="checkmark">✓</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
