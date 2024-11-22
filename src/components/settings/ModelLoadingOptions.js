import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import useWhisperStore from '../../stores/whisperStore';

const ModelLoadingOptions = ({ 
  autoLoadModel,
  onAutoLoadChange,
  whisperLoading 
}) => {
  const { keepModelLoaded, updateKeepModelLoaded } = useWhisperStore();

  const handleAutoLoadChange = (event) => {
    onAutoLoadChange(event.target.checked);
  };

  const handleKeepModelLoadedChange = (event) => {
    updateKeepModelLoaded(event.target.checked);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1">Model Loading Options</Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={autoLoadModel}
            onChange={handleAutoLoadChange}
            disabled={whisperLoading}
          />
        }
        label={
          <Box>
            <Typography>Auto-load Model on Startup</Typography>
            <Typography variant="caption" color="text.secondary">
              Automatically loads the model when the app starts
            </Typography>
          </Box>
        }
      />

      <FormControlLabel
        control={
          <Switch
            checked={keepModelLoaded}
            onChange={handleKeepModelLoadedChange}
            disabled={whisperLoading}
          />
        }
        label={
          <Box>
            <Typography>Keep Model Loaded when Minimized</Typography>
            <Typography variant="caption" color="text.secondary">
              Keeps the model in memory for faster voice commands, but uses more system resources
            </Typography>
          </Box>
        }
      />
    </Box>
  );
};

export default ModelLoadingOptions;
