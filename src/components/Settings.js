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
  styled,
  Typography,
  IconButton,
  alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.primary.dark, 0.15)
      : alpha(theme.palette.primary.light, 0.15),
  },
  '& .MuiDialogContent-root': {
    flex: 1,
    overflowY: 'auto',
    padding: 0,
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
    padding: theme.spacing(0.75, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    '& .MuiButton-root': {
      minHeight: 28,
      padding: theme.spacing(0.5, 2),
    }
  }
}));

const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  height: '100%',
  overflow: 'auto',
}));

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <StyledTabPanel>
          {children}
        </StyledTabPanel>
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
    updateAutoLoadModel,
    selectedLanguage,
    updateLanguage
  } = useWhisperStore();
  
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = React.useRef(null);

  useEffect(() => {
    window.electron.settings.get().then(savedSettings => {
      setGeneralSettings(savedSettings);
    });
  }, []);

  const handleSettingsChange = (newSettings) => {
    setGeneralSettings(newSettings);
  };

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
      <DialogTitle sx={(theme) => ({ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.primary.dark, 0.15)
          : alpha(theme.palette.primary.light, 0.15),
      })}>
        <Box component="div" sx={{ typography: 'h6' }}>Settings</Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={(theme) => ({ 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.primary.dark, 0.15)
            : alpha(theme.palette.primary.light, 0.15),
          position: 'sticky',
          top: 0,
          zIndex: 1,
          px: 2
        })}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.5
              }
            }}
          >
            <Tab label="General" value={0} />
            <Tab label="Whisper Setup" value={1} />
            <Tab label="AI Service" value={2} />
          </Tabs>
        </Box>

        <Box sx={{ height: 'calc(100% - 41px)' }}>
          <TabPanel value={currentTab} index={0}>
            {generalSettings && (
              <GeneralSettings 
                settings={generalSettings}
                onSettingsChange={handleSettingsChange}
              />
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 3,
              height: '100%'
            }}>
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
                  autoLoadModel={autoLoadModel}
                  onAutoLoadChange={handleAutoLoadChange}
                />
              </Box>
              {isModelLoaded && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  borderLeft: 1,
                  borderColor: 'divider',
                  pl: 3
                }}>
                  <AudioSettings
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={updateLanguage}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    transcriptionResult={transcriptionResult}
                  />
                </Box>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <AIServiceSettings />
          </TabPanel>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary" 
          size="medium"
          sx={{ 
            px: 4,
            py: 0.75,
            fontSize: '0.95rem'
          }}
        >
          Save
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default Settings;
