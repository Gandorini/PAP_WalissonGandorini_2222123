import { createTheme, ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';
import { PaletteMode } from '@mui/material';

declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
  }
}

// Configurações compartilhadas entre os temas
const getBaseTheme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: '#7F56D9', // Roxo moderno
      light: '#9E77ED',
      dark: '#6941C6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F670C7', // Rosa vibrante 
      light: '#FDA4AF',
      dark: '#DD2590',
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#FAFAFA' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1E1E1E',
    },
    text: {
      primary: mode === 'light' ? '#101828' : '#F5F5F5',
      secondary: mode === 'light' ? '#667085' : '#A0A0A0',
    },
    error: {
      main: '#F04438',
      light: '#FDA29B',
      dark: '#D92D20',
    },
    warning: {
      main: '#F79009',
      light: '#FEDF89',
      dark: '#B54708',
    },
    info: {
      main: '#2E90FA',
      light: '#84CAFF',
      dark: '#175CD3',
    },
    success: {
      main: '#12B76A',
      light: '#A6F4C5',
      dark: '#027A48',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      '@media (max-width:600px)': {
        fontSize: '1.75rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: mode === 'light' ? '#f1f1f1' : '#333',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: mode === 'light' ? '#D0D5DD' : '#666',
            borderRadius: '4px',
            '&:hover': {
              background: mode === 'light' ? '#98A2B3' : '#888',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' 
            ? '#6941C6' // Cor mais escura do roxo primário para mais contraste
            : '#2D2D3A', // Cor escura com um toque de roxo para o tema escuro
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 18px',
          transition: 'all 0.2s ease-in-out',
          '&.Mui-disabled': {
            backgroundColor: mode === 'light' ? '#F2F4F7' : '#333',
            color: mode === 'light' ? '#D0D5DD' : '#555',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06)',
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            transition: 'all 0.2s ease-in-out',
            '&.Mui-focused': {
              boxShadow: '0 0 0 4px rgba(127, 86, 217, 0.2)',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          '&:before': {
            display: 'none',
          },
          '&$expanded': {
            margin: '16px 0',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          transition: 'all 0.2s ease-in-out',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiPagination: {
      defaultProps: {
        shape: 'rounded',
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            color: '#6941C6',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '4px',
          fontSize: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
        },
      },
    },
  },
});

// Função para criar o tema com base no modo
export const createAppTheme = (mode: PaletteMode) => {
  return createTheme(getBaseTheme(mode), ptBR);
};

// Tema padrão (claro)
const theme = createAppTheme('light');

export default theme;
