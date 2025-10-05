import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import LanguageSelector from '../common/i18n/utils/LanguageSelector';
import { useTranslation } from '../common/i18n/i18n';

const Navbar = ({ toggleTheme, theme, logo }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [activeSubMenu, setActiveSubMenu] = React.useState(null);
  const menuRef = React.useRef(null);
  const submenuRefs = React.useRef({});
  const timeoutRef = React.useRef(null);
  const { t, currentLocale } = useTranslation();

  const cancelCloseMenu = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setIsMenuOpen(false);
      setActiveSubMenu(null);
    }
  };

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMenuItemMouseEnter = (menuName) => {
    cancelCloseMenu();
    setActiveSubMenu(menuName);
  };

  return (
    <div className="navbar">
      <div className="logo-container">
        <img src={logo} alt={t('householdTaskTracking')} className="app-logo" />
        <span className="app-title">{t('householdTasks')}</span>
      </div>
      <div className="menu-container" ref={menuRef}>
        <button
          className="menu-button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label={t('mainMenu')}
        >
          <span className="hamburger-icon">☰</span>
          <span>{t('menu')}</span>
        </button>
        {isMenuOpen && (
          <>
            <div
              className="menu-overlay"
              onClick={() => {
                setIsMenuOpen(false);
                setActiveSubMenu(null);
              }}
            ></div>
            <div className="dropdown-menu">
              {/* Élément avec sous-menu */}
              <div className="menu-item" data-menu="planning">
                <button
                  className="menu-item-button"
                  onMouseEnter={() => handleMenuItemMouseEnter('planning')}
                >
                  <span>📅 {t('managePlanning')}</span>
                  <span className="chevron">›</span>
                </button>
                {activeSubMenu === 'planning' && (
                  <div
                    className="submenu"
                    ref={el => (submenuRefs.current['planning'] = el)}
                    onMouseEnter={() => handleMenuItemMouseEnter('planning')}
                  >
                    <NavLink
                      to="/planner"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📅 {t('planning')}</span>
                    </NavLink>
                    <NavLink
                      to="/tasks"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📝 {t('tasks')}</span>
                    </NavLink>
                    <NavLink
                      to="/events"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🎉 {t('events')}</span>
                    </NavLink>
                    <NavLink
                      to="/people"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>👤 {t('people')}</span>
                    </NavLink>
                    <NavLink
                      to="/categories"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🏷️ {t('categories')}</span>
                    </NavLink>
                  </div>
                )}
              </div>
              {/* Élément avec sous-menu pour les contacts */}
              <div className="menu-item" data-menu="contacts">
                <button
                  className="menu-item-button"
                  onMouseEnter={() => handleMenuItemMouseEnter('contacts')}
                >
                  <span>👥 {t('manageContacts')}</span>
                  <span className="chevron">›</span>
                </button>
                {activeSubMenu === 'contacts' && (
                  <div
                    className="submenu"
                    ref={el => (submenuRefs.current['contacts'] = el)}
                    onMouseEnter={() => handleMenuItemMouseEnter('contacts')}
                  >
                    <NavLink
                      to="/contacts"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📞 {t('contacts')}</span>
                    </NavLink>
                  </div>
                )}
              </div>
              {/* Autres éléments de menu */}
              <div className="menu-item" data-menu="notes">
                <button
                  className="menu-item-button"
                  onMouseEnter={() => handleMenuItemMouseEnter('notes')}
                >
                  <span>📋 {t('manageNotes')}</span>
                  <span className="chevron">›</span>
                </button>
                {activeSubMenu === 'notes' && (
                  <div
                    className="submenu"
                    ref={el => (submenuRefs.current['notes'] = el)}
                    onMouseEnter={() => handleMenuItemMouseEnter('notes')}
                  >
                    <NavLink
                      to="/notes"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🗒️ {t('notes')}</span>
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Boutons d'actions */}
        <div className="navbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label={t('toggleTheme')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <LanguageSelector collapsed={true} />
      </div>
    </div>
  );
};

export default Navbar;
