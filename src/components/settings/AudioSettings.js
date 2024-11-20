import React from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import useWhisperStore from '../../stores/whisperStore';

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', nativeName: 'English' },
  { value: 'bg', label: 'Bulgarian', nativeName: 'български' },
  { value: 'es', label: 'Spanish', nativeName: 'Español' },
  { value: 'fr', label: 'French', nativeName: 'Français' },
  { value: 'de', label: 'German', nativeName: 'Deutsch' },
  { value: 'it', label: 'Italian', nativeName: 'Italiano' },
  { value: 'pt', label: 'Portuguese', nativeName: 'Português' },
  { value: 'ru', label: 'Russian', nativeName: 'Русский' },
  { value: 'zh', label: 'Chinese', nativeName: '中文' },
  { value: 'ja', label: 'Japanese', nativeName: '日本語' }
].sort((a, b) => a.label.localeCompare(b.label));

const AudioSettings = ({
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  transcriptionResult
}) => {
  const { selectedLanguage, updateLanguage } = useWhisperStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Audio Settings</Typography>

      <FormControl fullWidth>
        <InputLabel>Language</InputLabel>
        <Select
          value={selectedLanguage}
          onChange={(e) => updateLanguage(e.target.value)}
          label="Language"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <MenuItem key={lang.value} value={lang.value}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{lang.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {lang.nativeName}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant={isRecording ? "contained" : "outlined"}
          color={isRecording ? "error" : "primary"}
          startIcon={isRecording ? <StopIcon /> : <MicIcon />}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isProcessing}
        >
          {isRecording ? 'Stop Recording' : 'Test Microphone'}
        </Button>
        {isProcessing && (
          <Typography variant="body2" color="text.secondary">
            Processing audio...
          </Typography>
        )}
      </Box>

      {transcriptionResult && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Transcription Result:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {transcriptionResult}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AudioSettings;
