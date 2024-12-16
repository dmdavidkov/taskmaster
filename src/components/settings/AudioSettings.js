import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import useWhisperStore from '../../stores/whisperStore';
import useAIServiceStore from '../../stores/aiServiceStore';

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
  selectedLanguage,
  onLanguageChange
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [error, setError] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const { transcribe, isModelLoaded } = useWhisperStore();
  const { config: aiConfig } = useAIServiceStore();

  const processAudioData = async (audioBlob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);
      await audioContext.close();
      return audioData;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  };

  const startRecording = useCallback(async () => {
    if (!aiConfig.asrModel && !isModelLoaded) {
      setError('Please load the Whisper model first in the Model Settings tab.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        try {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
          const audioData = await processAudioData(audioBlob);
          const result = await transcribe(audioData, selectedLanguage);
          setTranscriptionResult(result);
          setError(null);
        } catch (err) {
          setError('Transcription error: ' + err.message);
          console.error('Error transcribing:', err);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
      setTranscriptionResult('');
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
      console.error('Error starting recording:', err);
    }
  }, [isModelLoaded, transcribe, selectedLanguage, aiConfig.asrModel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Audio Settings</Typography>

      <FormControl fullWidth>
        <InputLabel>Language</InputLabel>
        <Select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          label="Language"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <MenuItem key={lang.value} value={lang.value}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{lang.label}</Typography>
                <Typography color="text.secondary" sx={{ ml: 2 }}>
                  {lang.nativeName}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant={isRecording ? "contained" : "outlined"}
            color={isRecording ? "error" : "primary"}
            startIcon={isRecording ? <StopIcon /> : <MicIcon />}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !isModelLoaded}
          >
            {isRecording ? 'Stop Recording' : 'Test Microphone'}
          </Button>
          {isProcessing && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Transcribing audio...
              </Typography>
            </Box>
          )}
        </Box>
        
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </Box>

      {transcriptionResult && (
        <Box sx={{ 
          mt: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="subtitle2" gutterBottom>
            Transcription Result:
          </Typography>
          <Box sx={{ 
            flex: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 2,
            border: 1,
            borderColor: 'divider',
            overflowY: 'auto'
          }}>
            <Typography variant="body2">
              {transcriptionResult}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AudioSettings;
