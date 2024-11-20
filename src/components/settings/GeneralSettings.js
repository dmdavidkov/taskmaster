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

const GeneralSettings = ({
  darkMode,
  notifications,
  autoStart,
  onDarkModeChange,
  onNotificationsChange,
  onAutoStartChange
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">General Settings</Typography>

      <FormControlLabel
        control={
          <Switch
            checked={darkMode}
            onChange={(e) => onDarkModeChange(e.target.checked)}
          />
        }
        label="Dark Mode"
      />

      <FormControl fullWidth>
        <InputLabel>Notifications</InputLabel>
        <Select
          value={notifications ? 'all' : 'none'}
          onChange={(e) => onNotificationsChange(e.target.value === 'all')}
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
            checked={autoStart}
            onChange={(e) => onAutoStartChange(e.target.checked)}
          />
        }
        label="Auto-start on system startup"
      />
    </Box>
  );
};

export default GeneralSettings;
