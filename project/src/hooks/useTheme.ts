import { useThemeContext } from '../context/ThemeContext';
import { useTheme } from '@mui/material';

export const useAppTheme = () => {
  const theme = useTheme();
  const { mode, toggleColorMode } = useThemeContext();

  return {
    theme,
    mode,
    toggleMode: toggleColorMode,
    isDarkMode: mode === 'dark'
  };
}; 