import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'Tema do sistema',
  light: 'Tema claro',
  dark: 'Tema escuro',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  darkMode: boolean;
  cycleTheme: () => void;
  toggleDarkMode: () => void;
  themeLabel: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CYCLE_ORDER: ThemeMode[] = ['system', 'light', 'dark'];

function useSystemDarkMode() {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return systemDark;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = usePersistedState<ThemeMode>('crm_theme_mode', 'system');
  const systemDark = useSystemDarkMode();

  const darkMode = themeMode === 'system' ? systemDark : themeMode === 'dark';

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const cycleTheme = useCallback(() => {
    setThemeMode((current) => {
      const idx = CYCLE_ORDER.indexOf(current as ThemeMode);
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    });
  }, [setThemeMode]);

  const toggleDarkMode = cycleTheme;

  const themeLabel = THEME_LABELS[themeMode];

  return (
    <ThemeContext.Provider value={{ themeMode, darkMode, cycleTheme, toggleDarkMode, themeLabel }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
