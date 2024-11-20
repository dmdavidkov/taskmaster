import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  styled
} from '@mui/material';
import useWhisperStore from '../stores/whisperStore';
import ModelSettings from './settings/ModelSettings';
import AudioSettings from './settings/AudioSettings';
import GeneralSettings from './settings/GeneralSettings';
import AutoLoadSettings from './settings/AutoLoadSettings';
import AIServiceSettings from './settings/AIServiceSettings';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '90vw',
    maxWidth: '800px',
    minWidth: '600px',
    height: '80vh',
    maxHeight: '900px',
    minHeight: '600px',
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('sm')]: {
      width: '95vw',
      minWidth: 'auto',
      height: '90vh',
      minHeight: 'auto',
      margin: theme.spacing(1),
    },
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& .MuiDialogContent-root': {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(3),
    '&::-webkit-scrollbar': {
      width: '8px',
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.2)' 
        : 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
      },
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)'} transparent`,
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2, 3),
    borderTop: `1px solid ${theme.palette.divider}`,
  }
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings = ({ open, onClose, initialTab = 0 }) => {
  const { 
    loadModel,
    transcribe,
    isModelLoaded,
    isLoading: whisperLoading,
    error: whisperError,
    loadingProgress,
    loadingStage,
    modelConfig,
    updateModelConfig,
    resetSetup,
    autoLoadModel,
    updateAutoLoadModel
  } = useWhisperStore();
  
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = React.useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('whisperLanguage') || 'en');

  useEffect(() => {
    let tabIndex = 0;
    switch(initialTab) {
      case 'aiService':
        tabIndex = 1;
        break;
      case 'speech':
        tabIndex = 2;
        break;
      case 'about':
        tabIndex = 3;
        break;
      default:
        tabIndex = 0;
    }
    setCurrentTab(tabIndex);
  }, [initialTab]);

  const handleClose = () => {
    onClose();
  };

  const handleLoadWhisperModel = () => {
    loadModel();
  };

  const handleAutoLoadChange = (event) => {
    const newValue = event.target.checked;
    updateAutoLoadModel(newValue);
    
    if (newValue && !isModelLoaded && !whisperLoading) {
      loadModel();
    }
  };

  const handleResetSetup = () => {
    if (window.confirm('Are you sure you want to reset Whisper setup? You will need to load the model again.')) {
      resetSetup();
      setTranscriptionResult('');
    }
  };

  const startRecording = async () => {
    setTranscriptionResult('');
    let mediaStream = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      setRecordingStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      recorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Error setting up audio:', err);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      recordingStream?.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
      setIsRecording(false);
      
      const currentChunks = [...audioChunks];
      const audioBlob = new Blob(currentChunks, { type: 'audio/webm' });
      
      try {
        setIsProcessing(true);
        const processingContext = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await processingContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);
        
        setAudioChunks([]);
        
        const text = await transcribe(audioData, selectedLanguage);
        setTranscriptionResult(text);
        
        await processingContext.close();
      } catch (err) {
        console.error('Error processing audio:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    localStorage.setItem('whisperLanguage', selectedLanguage);
    handleClose();
  };

  const openTab = (tabName) => {
    switch (tabName) {
      case 'general':
        setCurrentTab(0);
        break;
      case 'whisperSetup':
        setCurrentTab(1);
        break;
      case 'aiService':
        setCurrentTab(2);
        break;
      default:
        break;
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="General" value={0} />
            <Tab label="Whisper Setup" value={1} />
            <Tab label="AI Service" value={2} />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <GeneralSettings
            darkMode={false}
            notifications={true}
            autoStart={false}
            onDarkModeChange={() => {}}
            onNotificationsChange={() => {}}
            onAutoStartChange={() => {}}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box>
            <ModelSettings
              modelConfig={modelConfig}
              updateModelConfig={updateModelConfig}
              isModelLoaded={isModelLoaded}
              whisperLoading={whisperLoading}
              whisperError={whisperError}
              loadingProgress={loadingProgress}
              loadingStage={loadingStage}
              onLoadModel={handleLoadWhisperModel}
              onResetSetup={handleResetSetup}
            />
            {isModelLoaded && (
              <>
                <Box sx={{ mt: 3 }}>
                  <AudioSettings
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    transcriptionResult={transcriptionResult}
                  />
                </Box>
                <Box sx={{ mt: 3 }}>
                  <AutoLoadSettings
                    autoLoadModel={autoLoadModel}
                    onAutoLoadChange={handleAutoLoadChange}
                  />
                </Box>
              </>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <AIServiceSettings />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default Settings;
