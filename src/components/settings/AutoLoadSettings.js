import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';

const AutoLoadSettings = ({
  autoLoadModel,
  onAutoLoadChange,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Auto-Load Configuration</Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={autoLoadModel}
            onChange={onAutoLoadChange}
          />
        }
        label="Auto-load model on startup"
      />
      
      <Typography variant="body2" color="text.secondary">
        When enabled, the model will be automatically loaded when you start the application.
        This may increase startup time but ensures the model is ready to use immediately.
      </Typography>
    </Box>
  );
};

export default AutoLoadSettings;
