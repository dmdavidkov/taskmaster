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
import useThemeStore from '../../stores/themeStore';

const GeneralSettings = ({ settings: initialSettings, onSettingsChange }) => {
  const { theme, setTheme, availableThemes } = useThemeStore();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const handleThemeChange = (value) => {
    setTheme(value);
    const newSettings = { ...initialSettings, theme: value };
    onSettingsChange(newSettings);
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
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          label="Theme"
        >
          <MenuItem value="system">
            System
            {theme === 'system' && (
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                (Currently {prefersDarkMode ? 'Dark' : 'Light'})
              </Typography>
            )}
          </MenuItem>
          {availableThemes.map(({ id, name }) => (
            <MenuItem key={id} value={id}>
              {name}
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
          <MenuItem value="all">All Notifications</MenuItem>
          <MenuItem value="important">Important Only</MenuItem>
          <MenuItem value="none">None</MenuItem>
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
