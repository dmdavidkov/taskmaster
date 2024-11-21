import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createTheme } from '@mui/material/styles';

// Define theme palettes
const themes = {
  light: createTheme({
    name: 'Light',
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  dark: createTheme({
    name: 'Dark',
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
      },
      secondary: {
        main: '#f48fb1',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  purple: createTheme({
    name: 'Purple Dream',
    palette: {
      mode: 'dark',
      primary: {
        main: '#b039c8',     // Brighter purple for better visibility
        light: '#d45aeb',    // Lighter and more vibrant
        dark: '#8c1fa2',     // Slightly brighter dark purple
      },
      secondary: {
        main: '#f1c5f7',     // Much lighter for better contrast
        light: '#fdf2ff',    // Almost white with purple tint
        dark: '#d69edf',     // Brighter dark secondary
      },
      background: {
        default: '#1a121c',  // Darker background for more contrast
        paper: '#2d1f30',    // Darker paper for more contrast
      },
      text: {
        primary: '#ffffff',   // Pure white text for maximum contrast
        secondary: '#e0c8e4', // Light purple-tinted text
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  purpleMist: createTheme({
    name: 'Purple Mist',
    palette: {
      mode: 'light',
      primary: {
        main: '#7B4B94',
      },
      secondary: {
        main: '#B4A3B9',
      },
      background: {
        default: '#F0EDF1',
        paper: '#FFFFFF',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  ocean: createTheme({
    name: 'Ocean Breeze',
    palette: {
      mode: 'light',
      primary: {
        main: '#006064',
        light: '#0097a7',
        dark: '#00363a',
      },
      secondary: {
        main: '#80deea',
        light: '#b4ffff',
        dark: '#4bacb8',
      },
      background: {
        default: '#e0f7fa',
        paper: '#ffffff',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  sunset: createTheme({
    name: 'Sunset',
    palette: {
      mode: 'dark',
      primary: {
        main: '#ff5722',
        light: '#ff8a50',
        dark: '#c41c00',
      },
      secondary: {
        main: '#ffb74d',
        light: '#ffe97d',
        dark: '#c88719',
      },
      background: {
        default: '#1a0f0f',
        paper: '#2d1c1c',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  forest: createTheme({
    name: 'Forest',
    palette: {
      mode: 'light',
      primary: {
        main: '#2e7d32',
        light: '#4caf50',
        dark: '#1b5e20',
      },
      secondary: {
        main: '#81c784',
        light: '#b2fab4',
        dark: '#519657',
      },
      background: {
        default: '#f1f8e9',
        paper: '#ffffff',
      },
    },
    shape: {
      borderRadius: 8,
    },
  }),

  dreamscape: createTheme({
    name: 'Dreamscape',
    palette: {
      mode: 'dark',
      primary: {
        main: '#8e44ad',
        light: '#a569bd',
        dark: '#6c3483',
      },
      secondary: {
        main: '#3498db',
        light: '#5dade2',
        dark: '#2980b9',
      },
      background: {
        default: '#1a1a2e',
        paper: '#16213e',
      },
      text: {
        primary: '#e8e8e8',
        secondary: '#b2bec3',
      },
      error: {
        main: '#e74c3c',
      },
      warning: {
        main: '#f39c12',
      },
      info: {
        main: '#00cec9',
      },
      success: {
        main: '#00b894',
      },
    },
    typography: {
      fontFamily: "'Raleway', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: {
        fontWeight: 300,
        letterSpacing: '-0.01562em',
      },
      h2: {
        fontWeight: 300,
        letterSpacing: '-0.00833em',
      },
      body1: {
        fontWeight: 400,
        letterSpacing: '0.00938em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    transitions: {
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 25,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 8px 40px -12px rgba(0,0,0,0.3)',
          },
        },
      },
    },
  }),
};

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system', // theme name or 'system'
      isDarkMode: false,
      muiTheme: themes.light,
      availableThemes: Object.entries(themes).map(([key, theme]) => ({
        id: key,
        name: theme.name || key.charAt(0).toUpperCase() + key.slice(1),
      })),
      
      setTheme: async (newTheme) => {
        // Update electron settings first
        await window.electron.settings.setTheme(newTheme);
        
        // Handle system theme
        if (newTheme === 'system') {
          const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          set({ 
            theme: newTheme,
            isDarkMode: prefersDarkMode,
            muiTheme: prefersDarkMode ? themes.dark : themes.light
          });
          return;
        }

        // Handle specific theme
        const selectedTheme = themes[newTheme] || themes.light;
        set({ 
          theme: newTheme,
          isDarkMode: selectedTheme.palette.mode === 'dark',
          muiTheme: selectedTheme
        });
      },

      toggleTheme: async () => {
        const { theme, isDarkMode } = get();
        if (theme === 'system') {
          await get().setTheme(isDarkMode ? 'light' : 'dark');
        } else {
          // Cycle through available themes
          const themeKeys = Object.keys(themes);
          const currentIndex = themeKeys.indexOf(theme);
          const nextIndex = (currentIndex + 1) % themeKeys.length;
          await get().setTheme(themeKeys[nextIndex]);
        }
      },

      initializeTheme: async () => {
        try {
          // Get theme from electron settings
          const settings = await window.electron.settings.get();
          const savedTheme = settings?.theme || 'system';
          
          // Update store state
          if (savedTheme === 'system') {
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            set({ 
              theme: savedTheme,
              isDarkMode: prefersDarkMode,
              muiTheme: prefersDarkMode ? themes.dark : themes.light
            });
          } else {
            const selectedTheme = themes[savedTheme] || themes.light;
            set({ 
              theme: savedTheme,
              isDarkMode: selectedTheme.palette.mode === 'dark',
              muiTheme: selectedTheme
            });
          }

          // Set up system theme change listener
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            const { theme } = get();
            if (theme === 'system') {
              set({ 
                isDarkMode: e.matches,
                muiTheme: e.matches ? themes.dark : themes.light
              });
            }
          });
        } catch (error) {
          console.error('Failed to initialize theme:', error);
          // Fallback to system theme
          const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          set({ 
            theme: 'system',
            isDarkMode: prefersDarkMode,
            muiTheme: prefersDarkMode ? themes.dark : themes.light
          });
        }
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }) // Only persist theme setting
    }
  )
);

export default useThemeStore;
