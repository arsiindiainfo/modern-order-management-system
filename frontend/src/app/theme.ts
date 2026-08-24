import { createTheme } from '@mui/material';

/**
 * Brand colors lifted directly from the Arsi India Info logo
 * (frontend/src/assets/brand/) — blue, pink, green swirl mark.
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1D5FEB',
      dark: '#123FAE',
    },
    secondary: {
      main: '#D6127D',
    },
    success: {
      main: '#1E9E4A',
    },
    background: {
      default: '#F3F4F6',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0B1A33',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
