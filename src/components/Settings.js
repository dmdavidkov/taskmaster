import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  Tabs,
  Tab,
  Link,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormGroup,
  FormHelperText
} from '@mui/material';
import { styled } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import StopIcon from '@mui/icons-material/Stop';
import MicIcon from '@mui/icons-material/Mic';

import useWhisperStore from '../stores/whisperStore';

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

// Model configuration options
const MODEL_OPTIONS = {
  models: [
    { 
      value: 'onnx-community/whisper-large-v3-turbo', 
      label: 'Whisper Large V3 Turbo',
      description: 'Best performance, largest model'
    },
    { 
      value: 'onnx-community/whisper-base', 
      label: 'Whisper Base',
      description: 'Balanced performance and speed'
    },
    { 
      value: 'onnx-community/whisper-small', 
      label: 'Whisper Small',
      description: 'Fast, average accuracy'
    },
    { 
      value: 'onnx-community/whisper-tiny', 
      label: 'Whisper Tiny',
      description: 'Fastest, lower accuracy'
    }
  ],
  quantization: [
    {
      value: 'fp32',
      label: 'FP32 (Most Accurate)',
      description: 'Highest accuracy, slowest processing'
    },
    {
      value: 'fp16',
      label: 'FP16 (Accurate)',
      description: 'High accuracy, slower processing'
    },
    {
      value: 'q8',
      label: 'Q8 (Balanced)',
      description: 'Good balance of speed and accuracy'
    },
    {
      value: 'int8',
      label: 'INT8 (Fast)',
      description: 'Fast processing, reduced accuracy'
    },
    {
      value: 'uint8',
      label: 'UINT8 (Fast)',
      description: 'Fast processing, reduced accuracy'
    },
    {
      value: 'q4',
      label: 'Q4 (Faster)',
      description: 'Faster inference, smaller size, lower accuracy'
    },
    {
      value: 'bnb4',
      label: 'BNB4 (Optimized)',
      description: 'Optimized for specific hardware, balance of speed and accuracy'
    },
    {
      value: 'q4f16',
      label: 'Q4F16 (Hybrid)',
      description: 'Hybrid of Q4 and FP16, balancing speed and accuracy'
    }
  ]
};

// Language options with ISO codes
const LANGUAGE_OPTIONS = [
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

// General settings options
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

const Settings = ({ open, onClose }) => {
  const { 
    initializeWorker,
    loadModel,
    transcribe,
    isModelLoaded,
    isLoading: whisperLoading,
    error: whisperError,
    loadingProgress,
    loadingStage,
    hasCompletedSetup,
    resetSetup,
    modelConfig,
    updateModelConfig,
    cleanup
  } = useWhisperStore();
  
  const [currentTab, setCurrentTab] = React.useState(0);
  const [showSetupGuide, setShowSetupGuide] = React.useState(!hasCompletedSetup);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = React.useRef(null);
  const [autoLoadModel, setAutoLoadModel] = useState(localStorage.getItem('autoLoadWhisperModel') === 'true');
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoStart, setAutoStart] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('whisperLanguage') || 'en');
  const dialogRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      // Store the currently focused element when dialog opens
      previousFocusRef.current = document.activeElement;
    }
  }, [open]);

  const handleClose = (event, reason) => {
    // Return focus to the previous element before closing
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
    onClose(event, reason);
  };

  const handleLoadWhisperModel = () => {
    loadModel();
  };

  const handleAutoLoadChange = (event) => {
    const newValue = event.target.checked;
    setAutoLoadModel(newValue);
    localStorage.setItem('autoLoadWhisperModel', newValue);
    
    // If turning on auto-load and model isn't loaded, load it now
    if (newValue && hasCompletedSetup && !isModelLoaded && !whisperLoading) {
      loadModel();
    }
  };

  const handleResetSetup = () => {
    if (window.confirm('Are you sure you want to reset Whisper setup? You will need to load the model again.')) {
      resetSetup();
      setShowSetupGuide(true);
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
      
      // Process the recording
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

  const handleTestWhisper = async () => {
    if (!isModelLoaded && !isRecording) {
      whisperError('Please load the model first');
      return;
    }

    if (!isRecording) {
      setAudioChunks([]);
      await startRecording();
    } else {
      stopRecording();
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    localStorage.setItem('whisperLanguage', selectedLanguage);
    handleClose();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getLoadingMessage = (progress, stage) => {
    if (stage === 'downloading') {
      // If we're loading from cache, show that immediately
      if (progress._cached) {
        return 'Loading model from cache...';
      }

      // Only show files that are actually downloading
      const files = Object.entries(progress)
        .filter(([_, data]) => 
          data.total > 0 && 
          data.loaded > 0 && 
          !data.cached && // Skip cached files
          data.loaded !== data.total // Skip fully loaded files
        )
        .sort((a, b) => b[1].total - a[1].total);
      
      if (files.length === 0) {
        return 'Preparing model...';
      }
      
      return files.map(([filename, data]) => {
        const percentage = (data.progress || 0).toFixed(1);
        const loaded = formatBytes(data.loaded);
        const total = formatBytes(data.total);
        return `${filename}: ${percentage}% (${loaded}/${total})`;
      }).join('\n');
    } else if (stage === 'loading') {
      return progress._cached ? 
        'Initializing cached model...' : 
        'Loading model into memory...';
    } else if (stage === 'preparing') {
      return 'Preparing model for inference...';
    }
    return 'Initializing...';
  };

  const renderModelStatus = () => {
    if (whisperError) {
      return (
        <Alert severity="error" sx={{ width: '100%' }}>
          {whisperError}
        </Alert>
      );
    }
    
    if (whisperLoading) {
      const messages = getLoadingMessage(loadingProgress, loadingStage).split('\n');
      
      return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: '100%', 
            maxWidth: '500px',
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1
          }}>
            {messages.map((message, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.02)',
                borderRadius: '4px'
              }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary" sx={{ 
                  fontFamily: 'monospace',
                  whiteSpace: 'pre',
                  flexGrow: 1
                }}>
                  {message}
                </Typography>
              </Box>
            ))}
          </Box>
          {loadingStage === 'downloading' && (
            <Typography variant="caption" color="text.secondary">
              This may take a few minutes depending on your internet speed
            </Typography>
          )}
        </Box>
      );
    }

    if (isModelLoaded) {
      return (
        <Alert severity="success" sx={{ width: '100%' }}>
          Model loaded successfully
        </Alert>
      );
    }

    return null;
  };

  return (
    <StyledDialog
      ref={dialogRef}
      open={open}
      onClose={handleClose}
      aria-labelledby="settings-dialog-title"
      disableEscapeKeyDown={whisperLoading}
      disableRestoreFocus
    >
      <DialogTitle id="settings-dialog-title">
        <SettingsIcon /> Settings
      </DialogTitle>
      <DialogContent>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.9rem',
            }
          }}
        >
          <Tab 
            icon={<SettingsIcon />} 
            label="General" 
            iconPosition="start"
          />
          <Tab 
            icon={<MicIcon />} 
            label="Voice Input" 
            iconPosition="start"
          />
          <Tab 
            icon={<HelpOutlineIcon />} 
            label="Help" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="theme-select-label">Theme</InputLabel>
            <Select
              labelId="theme-select-label"
              label="Theme"
              value={darkMode ? 'dark' : 'light'}
              onChange={(e) => setDarkMode(e.target.value === 'dark')}
            >
              {GENERAL_SETTINGS.themes.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Choose your preferred appearance</FormHelperText>
          </FormControl>

          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="notifications-select-label">Notification Level</InputLabel>
            <Select
              labelId="notifications-select-label"
              label="Notification Level"
              value={notifications ? 'all' : 'none'}
              onChange={(e) => setNotifications(e.target.value === 'all')}
            >
              {GENERAL_SETTINGS.notifications.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Configure notification preferences</FormHelperText>
          </FormControl>

          <Typography variant="h6" gutterBottom>
            Startup
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
            }
            label="Auto-start App"
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Speech Recognition
          </Typography>

          {showSetupGuide ? (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Welcome to Speech Recognition Setup! Follow these steps to enable voice input:
                <ol style={{ marginBottom: 0 }}>
                  <li>Ensure you have a working microphone</li>
                  <li>Click "Load Whisper Model" to download and initialize the model</li>
                  <li>Wait for the model to finish loading</li>
                  <li>Test the speech recognition using the test button</li>
                </ol>
              </Alert>
            </Box>
          ) : null}

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="model-select-label">Model</InputLabel>
              <Select
                labelId="model-select-label"
                label="Model"
                value={modelConfig.modelId || ''}
                onChange={(e) => updateModelConfig({ modelId: e.target.value })}
                disabled={whisperLoading}
              >
                {MODEL_OPTIONS.models.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select a Whisper model variant</FormHelperText>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="encoder-model-label">Encoder Quantization</InputLabel>
              <Select
                labelId="encoder-model-label"
                label="Encoder Quantization"
                value={modelConfig.encoderModel || ''}
                onChange={(e) => updateModelConfig({ encoderModel: e.target.value })}
                disabled={whisperLoading}
              >
                {MODEL_OPTIONS.quantization.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Lower quantization = faster but less accurate</FormHelperText>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="decoder-model-label">Decoder Quantization</InputLabel>
              <Select
                labelId="decoder-model-label"
                label="Decoder Quantization"
                value={modelConfig.decoderModel || ''}
                onChange={(e) => updateModelConfig({ decoderModel: e.target.value })}
                disabled={whisperLoading}
              >
                {MODEL_OPTIONS.quantization.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Lower quantization = faster but less accurate</FormHelperText>
            </FormControl>
          </Box>

          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel id="language-select-label">Recognition Language</InputLabel>
            <Select
              labelId="language-select-label"
              label="Recognition Language"
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                localStorage.setItem('whisperLanguage', e.target.value);
              }}
            >
              {LANGUAGE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoLoadModel}
                  onChange={handleAutoLoadChange}
                  disabled={!hasCompletedSetup}
                />
              }
              label="Automatically load model on startup"
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleLoadWhisperModel}
                disabled={whisperLoading || isModelLoaded}
                startIcon={whisperLoading ? <CircularProgress size={20} /> : <SmartToyIcon />}
                color="primary"
                sx={{ flexGrow: 1 }}
              >
                {whisperLoading ? 'Loading...' : isModelLoaded ? 'Model Loaded' : 'Load Whisper Model'}
              </Button>

              {hasCompletedSetup && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleResetSetup}
                  startIcon={<StopIcon />}
                >
                  Reset
                </Button>
              )}
            </Box>
            {renderModelStatus()}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="subtitle1" component="h3">
              Test Speech Recognition
            </Typography>
            
            <Button
              variant="contained"
              color={isRecording ? "error" : "secondary"}
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              onClick={handleTestWhisper}
              disabled={!isModelLoaded || whisperLoading}
            >
              {isRecording ? "Stop Recording" : "Test Speech Recognition"}
            </Button>
          </Box>

          {transcriptionResult && (
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ 
                p: 2,
                bgcolor: 'success.light',
                color: 'success.contrastText',
                borderColor: 'success.main'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Transcription Result:
              </Typography>
              <Typography>{transcriptionResult}</Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Help Guide
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to TaskMaster! Here are some key features to get you started:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                🎯 Task Management
              </Typography>
              <Typography variant="body2" paragraph>
                Create, organize, and track your tasks efficiently. Use the "Add Task" button to create new tasks.
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                🤖 AI Integration
              </Typography>
              <Typography variant="body2" paragraph>
                TaskMaster uses advanced AI to help analyze and categorize your tasks. 
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                ⚡ Quick Tips
              </Typography>
              <Typography variant="body2" component="div">
                • Use keyboard shortcuts for faster navigation<br/>
                • Enable notifications to stay updated<br/>
                • Try dark mode for comfortable night viewing
              </Typography>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              Need more help? Visit our{' '}
              <Link href="#" color="primary">
                documentation
              </Link>
              {' '}or contact{' '}
              <Link href="#" color="primary">
                support
              </Link>
            </Typography>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={whisperLoading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={whisperLoading}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default Settings;
