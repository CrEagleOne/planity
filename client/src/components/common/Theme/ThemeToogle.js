import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTranslation } from '../Translate/TranslationContext';
import '../styles/ThemeToggle.css';

function ThemeToggle({ darkMode, toggleTheme, collapsed = false }) {
  const { t } = useTranslation();

  return (
    <div className={`theme-toggle-container ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="theme-toggle-button"
        onClick={toggleTheme}
        aria-label={darkMode ? t('switchToLightMode') : t('switchToDarkMode')}
        aria-pressed={darkMode}
      >
        {collapsed ? (
          <span className="theme-icon-wrapper">
            {darkMode ? <FaMoon /> : <FaSun />}
          </span>
        ) : (
          <>
            <span className="theme-icon-wrapper">
              {darkMode ? <FaMoon /> : <FaSun />}
            </span>
            {!collapsed && (
              <span className="theme-label">
                {darkMode ? t('darkModeLabel') : t('lightModeLabel')}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;
