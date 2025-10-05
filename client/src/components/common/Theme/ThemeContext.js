import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Vérifier le thème préféré par l'utilisateur dans localStorage
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // État initial basé sur les préférences sauvegardées ou système
  const [theme, setTheme] = useState(savedTheme || (prefersDarkScheme ? 'dark' : 'light'));

  // Appliquer le thème au document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--primary-color', '#6c5ce7');
      root.style.setProperty('--secondary-color', '#a29bfe');
      root.style.setProperty('--accent-color', '#fd79a8');
      root.style.setProperty('--dark-color', '#2d3436');
      root.style.setProperty('--light-color', '#f5f6fa');
      root.style.setProperty('--bg-color', '#1e272e');
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--text-color', '#f5f6fa');
      root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.05)');
    } else {
      root.style.setProperty('--primary-color', '#6c5ce7');
      root.style.setProperty('--secondary-color', '#a29bfe');
      root.style.setProperty('--accent-color', '#fd79a8');
      root.style.setProperty('--dark-color', '#f5f6fa');
      root.style.setProperty('--light-color', '#2d3436');
      root.style.setProperty('--bg-color', '#f1f2f6');
      root.style.setProperty('--card-bg', 'rgba(45, 52, 54, 0.05)');
      root.style.setProperty('--text-color', '#2d3436');
      root.style.setProperty('--text-secondary', 'rgba(45, 52, 54, 0.7)');
      root.style.setProperty('--border-color', 'rgba(45, 52, 54, 0.1)');
      root.style.setProperty('--input-bg', 'rgba(45, 52, 54, 0.05)');
    }

    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
