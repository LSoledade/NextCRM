'use client';

import { createTheme } from '@mui/material/styles';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
});

export const theme = createTheme({
  palette: {
    primary: {
      main: '#E9342E',
      light: '#FF6B61',
      dark: '#C62828',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF9334',
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FA', // Cinza mais suave para melhor contraste
      paper: '#FFFFFF',
    },
    text: {
      primary: '#303030',
      secondary: '#666666',
    },
    error: {
      main: '#F44336',
    },
    warning: {
      main: '#FF9800',
    },
    info: {
      main: '#2196F3',
    },
    success: {
      main: '#4CAF50',
    },
    action: {
      hover: 'rgba(233, 52, 46, 0.04)',
      selected: 'rgba(233, 52, 46, 0.08)',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: outfit.style.fontFamily,
    h1: {
      fontWeight: 700,
      textTransform: 'uppercase',
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      textTransform: 'uppercase',
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.12)',
    '0px 1px 5px rgba(0, 0, 0, 0.12)',
    '0px 1px 8px rgba(0, 0, 0, 0.12)',
    '0px 1px 10px rgba(0, 0, 0, 0.12)',
    '0px 1px 14px rgba(0, 0, 0, 0.12)',
    '0px 1px 18px rgba(0, 0, 0, 0.12)',
    '0px 2px 16px rgba(0, 0, 0, 0.12)',
    '0px 3px 14px rgba(0, 0, 0, 0.12)',
    '0px 3px 16px rgba(0, 0, 0, 0.12)',
    '0px 4px 18px rgba(0, 0, 0, 0.12)',
    '0px 4px 20px rgba(0, 0, 0, 0.12)',
    '0px 5px 22px rgba(0, 0, 0, 0.12)',
    '0px 5px 24px rgba(0, 0, 0, 0.12)',
    '0px 5px 26px rgba(0, 0, 0, 0.12)',
    '0px 6px 28px rgba(0, 0, 0, 0.12)',
    '0px 6px 30px rgba(0, 0, 0, 0.12)',
    '0px 6px 32px rgba(0, 0, 0, 0.12)',
    '0px 7px 34px rgba(0, 0, 0, 0.12)',
    '0px 7px 36px rgba(0, 0, 0, 0.12)',
    '0px 8px 38px rgba(0, 0, 0, 0.12)',
    '0px 8px 40px rgba(0, 0, 0, 0.12)',
    '0px 8px 42px rgba(0, 0, 0, 0.12)',
    '0px 9px 44px rgba(0, 0, 0, 0.12)',
    '0px 9px 46px rgba(0, 0, 0, 0.12)',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
      variants: [
        {
          props: { variant: 'outlined' },
          style: {
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: 'none',
          },
        },
        {
          props: { variant: 'elevation' },
          style: {
            border: 'none',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.12)',
          },
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});