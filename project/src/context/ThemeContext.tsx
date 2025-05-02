import { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { ThemeProvider as MUIThemeProvider, PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme';

type ThemeContextType = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Inicializa com o tema salvo no localStorage ou o padrão (light)
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as PaletteMode) || 'light';
  });

  // Cria o tema atual com base no modo
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Salva no localStorage quando o modo muda
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Função para alternar entre temas
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Valores do contexto
  const contextValue = useMemo(() => {
    return { mode, toggleColorMode };
  }, [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 