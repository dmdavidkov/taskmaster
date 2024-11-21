import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  Alert,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import { 
  Mic as MicIcon, 
  Stop as StopIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import AudioVisualizer from './AudioVisualizer';
import useWhisperStore from '../stores/whisperStore';

const VoiceRecordDialog = ({ 
  open, 
  onClose, 
  onTranscriptionComplete, 
  autoStart = true 
}) => {
  const { 
    worker,
    isModelLoaded,
    isLoading: whisperLoading,
    transcribe,
    error: whisperError,
    selectedLanguage
  } = useWhisperStore();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [transcriptionError, setTranscriptionError] = useState('');
  const [processingState, setProcessingState] = useState('');
  const [audioStream, setAudioStream] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        setProcessingState('Processing audio...');
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioData = await processAudioData(audioBlob);
          console.log('Transcribing with language:', selectedLanguage);
          const text = await transcribe(audioData, selectedLanguage);
          setTranscribedText(text);
          onTranscriptionComplete?.(text, selectedLanguage);
        } catch (error) {
          console.error('Transcription error:', error);
          setTranscriptionError('Failed to transcribe audio. Please try again.');
        } finally {
          setIsProcessing(false);
          setProcessingState('');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscriptionError('');
    } catch (error) {
      console.error('Error starting recording:', error);
      setTranscriptionError('Failed to access microphone. Please check permissions.');
    }
  }, [selectedLanguage, onTranscriptionComplete, transcribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    }
  }, [isRecording, audioStream]);

  const handleClose = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setTranscribedText('');
    setTranscriptionError('');
    onClose?.();
  }, [isRecording, stopRecording, onClose]);

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

  useEffect(() => {
    if (open && autoStart && isModelLoaded && !whisperLoading && !whisperError) {
      // Small delay to ensure dialog is fully mounted
      const timer = setTimeout(() => {
        startRecording();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, autoStart, isModelLoaded, whisperLoading, whisperError, startRecording]);

  useEffect(() => {
    if (!open) {
      // Cleanup when dialog closes
      if (isRecording) {
        stopRecording();
      }
      setTranscribedText('');
      setTranscriptionError('');
      setProcessingState('');
    }
  }, [open, isRecording, stopRecording]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none !important',
          maxHeight: 'none',
          m: 0,
          p: 0,
          bgcolor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'none',
          pointerEvents: 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: -1
          },
          '& .MuiDialogContent-root': {
            pointerEvents: 'auto'
          }
        }
      }}
      sx={{
        bgcolor: 'transparent',
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0, 0, 0, 0.2)'
        }
      }}
    >
      <DialogContent 
        sx={{ 
          position: 'relative',
          zIndex: 1,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 2
        }}
      >
        {/* Language Selection */}
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Chip
            icon={<LanguageIcon />}
            label={selectedLanguage}
            color="primary"
            size="small"
          />
        </Box>

        {/* Central Content Area */}
        <Box sx={{ 
          flex: 1,
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 2,
          mt: '15%', 
          mb: 'auto'
        }}>
          {/* Status Messages */}
          {whisperError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {whisperError}
            </Alert>
          )}
          
          {transcriptionError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {transcriptionError}
            </Alert>
          )}

          {/* Processing State */}
          {processingState && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                width: '100%',
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.85)'
                  : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0, 0, 0, 0.6)'
                  : '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.95)'
                      : 'rgba(0, 0, 0, 0.9)',
                    fontWeight: 500
                  }}
                >
                  {processingState}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Transcribed Text */}
          {transcribedText && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                width: '100%',
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.85)'
                  : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0, 0, 0, 0.6)'
                  : '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Typography 
                variant="body1" 
                align="center" 
                sx={{ 
                  width: '100%',
                  color: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(0, 0, 0, 0.9)',
                  fontWeight: 500,
                  lineHeight: 1.6
                }}
              >
                {transcribedText}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Audio Visualizer */}
        <Box sx={{ 
          position: 'absolute',
          top: '60%', 
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          pointerEvents: 'none'
        }}>
          <AudioVisualizer 
            isRecording={isRecording}
            audioStream={audioStream}
          />
        </Box>

        {/* Bottom Controls */}
        <Box sx={{ 
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {isRecording && (
            <IconButton
              color="primary"
              size="large"
              onClick={stopRecording}
              sx={{
                width: 64,
                height: 64,
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.85)'
                  : 'background.paper',
                '&:hover': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(0, 0, 0, 0.95)'
                    : 'background.paper',
                },
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0, 0, 0, 0.6)'
                  : '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}
            >
              <StopIcon />
            </IconButton>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceRecordDialog;