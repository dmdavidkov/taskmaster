import React, { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import useWhisperStore from '../stores/whisperStore';

const VoiceRecordDialog = ({ 
  open, 
  onClose, 
  onTranscriptionComplete,
  autoStartRecording = false
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
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recorderRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [processingState, setProcessingState] = useState('');

  useEffect(() => {
    if (open) {
      setIsRecording(false);
      setRecordingStream(null);
      setAudioChunks([]);
      setIsProcessing(false);
      setTranscriptionError(null);
      setTranscribedText('');
      setProcessingState('');

      // Start recording automatically if enabled and model is ready
      if (autoStartRecording && isModelLoaded && !whisperLoading && !whisperError) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          startRecording();
        }, 100);
      }
    }
  }, [open, autoStartRecording, isModelLoaded, whisperLoading, whisperError]);

  useEffect(() => {
    // No-op, removed previous auto-start effect
  }, []);

  const processAudioData = async (audioBlob) => {
    try {
      setProcessingState('Converting audio...');
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Create AudioContext with correct sample rate
      const audioContext = new AudioContext({ sampleRate: 16000 });
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get the Float32Array data
      const audioData = audioBuffer.getChannelData(0);
      
      // Clean up
      await audioContext.close();
      
      return audioData;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  };

  const startRecording = async () => {
    // Don't start if model isn't ready
    if (!isModelLoaded || whisperLoading || whisperError) {
      setTranscriptionError('Please wait for the speech recognition model to load.');
      return;
    }

    try {
      setProcessingState('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        try {
          setProcessingState('Processing audio...');
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioData = await processAudioData(audioBlob);
          
          setProcessingState('Transcribing...');
          const text = await transcribe(audioData, selectedLanguage);
          setTranscribedText(text);
          
          setProcessingState('Creating task...');
          onTranscriptionComplete(text, selectedLanguage);
        } catch (error) {
          console.error('Transcription error:', error);
          setTranscriptionError(error.message);
          setIsProcessing(false);
        }
      };
      
      setAudioChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
      setTranscriptionError(null);
      setTranscribedText('');
      setProcessingState('Recording...');
    } catch (error) {
      console.error('Error starting recording:', error);
      setTranscriptionError(error.message);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }
  };

  const handleClose = () => {
    stopRecording();
    setIsRecording(false);
    setRecordingStream(null);
    setAudioChunks([]);
    setIsProcessing(false);
    setTranscriptionError(null);
    setTranscribedText('');
    setProcessingState('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      onClick={(e) => e.stopPropagation()}
      PaperProps={{
        sx: {
          minWidth: '300px',
          maxWidth: '400px'
        }
      }}
    >
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', py: 2 }}>
          {transcriptionError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {transcriptionError}
            </Alert>
          )}

          {(whisperLoading || isProcessing) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                {processingState}
              </Typography>
            </Box>
          )}

          <IconButton
            onClick={isRecording ? stopRecording : startRecording}
            disabled={whisperLoading || isProcessing || !isModelLoaded}
            color={isRecording ? 'error' : 'primary'}
            size="large"
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </IconButton>

          {transcribedText && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Transcribed Text:
              </Typography>
              <Typography variant="body1">
                {transcribedText}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceRecordDialog;
