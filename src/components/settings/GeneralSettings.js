import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
} from '@mui/material';

const GENERAL_SETTINGS = {
  themes: [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ],
  notifications: [
    { value: 'all', label: 'All Notifications' },
    { value: 'important', label: 'Important Only' },
    { value: 'none', label: 'None' }
  ]
};

const GeneralSettings = ({ settings: initialSettings, onSettingsChange }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const handleThemeChange = (value) => {
    const isDark = value === 'system' ? prefersDarkMode : value === 'dark';
    
    window.electron.settings.setTheme(value).then(() => {
      const newSettings = { ...initialSettings, theme: value };
      onSettingsChange(newSettings);
      
      localStorage.setItem('darkMode', JSON.stringify(isDark));
      window.dispatchEvent(new CustomEvent('themeChange', { 
        detail: { darkMode: isDark }
      }));
    });
  };

  const handleNotificationsChange = (value) => {
    window.electron.settings.setNotifications(value).then(() => {
      const newSettings = { ...initialSettings, notifications: value };
      onSettingsChange(newSettings);
    });
  };

  const handleMinimizeToTrayChange = (checked) => {
    window.electron.settings.setMinimizeToTray(checked).then(() => {
      const newSettings = { ...initialSettings, minimizeToTray: checked };
      onSettingsChange(newSettings);
    });
  };

  const handleAutoStartChange = (checked) => {
    window.electron.settings.setAutoStart(checked).then(() => {
      const newSettings = { ...initialSettings, autoStart: checked };
      onSettingsChange(newSettings);
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">General Settings</Typography>

      <FormControl fullWidth>
        <InputLabel>Theme</InputLabel>
        <Select
          value={initialSettings.theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          label="Theme"
        >
          {GENERAL_SETTINGS.themes.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
              {option.value === 'system' && (
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  (Currently {prefersDarkMode ? 'Dark' : 'Light'})
                </Typography>
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Notifications</InputLabel>
        <Select
          value={initialSettings.notifications}
          onChange={(e) => handleNotificationsChange(e.target.value)}
          label="Notifications"
        >
          {GENERAL_SETTINGS.notifications.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={initialSettings.minimizeToTray}
            onChange={(e) => handleMinimizeToTrayChange(e.target.checked)}
          />
        }
        label="Minimize to System Tray"
      />

      <FormControlLabel
        control={
          <Switch
            checked={initialSettings.autoStart}
            onChange={(e) => handleAutoStartChange(e.target.checked)}
          />
        }
        label="Start on System Startup"
      />
    </Box>
  );
};

export default GeneralSettings;
