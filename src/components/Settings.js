import React from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import StopIcon from '@mui/icons-material/Stop';
import MicIcon from '@mui/icons-material/Mic';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '100%',
    maxWidth: 600,
    backgroundColor: theme.palette.background.paper,
  },
  '& .MuiDialogContent-root': {
    scrollbarWidth: 'none',  // Firefox
    '&::-webkit-scrollbar': {
      display: 'none'  // Chrome, Safari, Edge
    },
    msOverflowStyle: 'none',  // IE, Edge
    overflowY: 'auto',
    paddingRight: theme.spacing(3),
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

const Settings = ({ open, onClose }) => {
  const [currentTab, setCurrentTab] = React.useState(0);
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoStart, setAutoStart] = React.useState(false);
  const [whisperLoading, setWhisperLoading] = React.useState(false);
  const [whisperError, setWhisperError] = React.useState(null);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingStream, setRecordingStream] = React.useState(null);
  const [audioChunks, setAudioChunks] = React.useState([]);
  const [isModelReady, setIsModelReady] = React.useState(false);
  const whisperWorkerRef = React.useRef(null);
  const recorderRef = React.useRef(null);

  React.useEffect(() => {
    whisperWorkerRef.current = new Worker(
      new URL('../workers/whisperWorker.js', import.meta.url),
      { type: 'module' }
    );

    whisperWorkerRef.current.onmessage = (e) => {
      const { status, error, progress, message, text } = e.data;
      
      switch (status) {
        case 'loading':
          setWhisperLoading(true);
          setIsModelReady(false);
          setLoadingMessage(message || 'Loading model...');
          break;
        case 'progress':
          setLoadingProgress(progress || 0);
          setLoadingMessage(message || 'Loading model...');
          break;
        case 'ready':
          setWhisperLoading(false);
          setIsModelReady(true);
          setLoadingProgress(100);
          setLoadingMessage('Model ready');
          break;
        case 'complete':
          setWhisperLoading(false);
          setLoadingMessage('Transcription complete');
          alert('Transcription: ' + text);
          break;
        case 'error':
          console.error('Worker error:', error);
          setWhisperError(error);
          setWhisperLoading(false);
          setIsModelReady(false);
          break;
      }
    };

    return () => {
      if (whisperWorkerRef.current) {
        whisperWorkerRef.current.terminate();
      }
    };
  }, []);

  const handleLoadWhisperModel = async () => {
    if (!navigator.gpu) {
      setWhisperError('WebGPU is not available in your browser');
      return;
    }
    
    setWhisperLoading(true);
    setWhisperError(null);
    setLoadingProgress(0);
    setLoadingMessage('Initializing...');
    whisperWorkerRef.current.postMessage({ type: 'load' });
  };

  const startRecording = async () => {
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
      
      let recorder;
      try {
        recorder = new MediaRecorder(mediaStream, {
          mimeType: 'audio/webm;codecs=opus'
        });
      } catch (err) {
        console.log('Falling back to default format');
        recorder = new MediaRecorder(mediaStream);
      }
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      recorderRef.current = recorder;
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setLoadingMessage('Recording...');
    } catch (err) {
      console.error('Error setting up audio:', err);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setWhisperError('Error accessing microphone. Please make sure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      recordingStream?.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    if (audioChunks.length === 0) return;
    
    setWhisperLoading(true);
    setLoadingMessage('Processing audio...');
    const currentChunks = [...audioChunks];
    const audioBlob = new Blob(currentChunks, { type: 'audio/webm' });
    
    try {
      const processingContext = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await processingContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);
      
      setAudioChunks([]);
      
      whisperWorkerRef.current.postMessage({ 
        type: 'transcribe',
        audio: audioData,
        language: 'en',
      });

      await processingContext.close();
    } catch (err) {
      console.error('Error processing audio:', err);
      setWhisperError('Error processing audio. Please try again with a shorter recording.');
      setWhisperLoading(false);
    }
  };

  const handleTestWhisper = async () => {
    if (!isModelReady && !isRecording) {
      setWhisperError('Please load the model first');
      return;
    }

    if (!isRecording) {
      setAudioChunks([]);
      await startRecording();
    } else {
      stopRecording();
      setTimeout(() => {
        processRecording();
      }, 100);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    // TODO: Save settings
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      aria-labelledby="settings-dialog-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="settings-dialog-title" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Settings
          </Typography>
        </Box>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<SettingsIcon />} 
            label="General" 
            id="settings-tab-0"
            aria-controls="settings-tabpanel-0"
          />
          <Tab 
            icon={<SmartToyIcon />} 
            label="AI" 
            id="settings-tab-1"
            aria-controls="settings-tabpanel-1"
          />
          <Tab 
            icon={<HelpOutlineIcon />} 
            label="Help" 
            id="settings-tab-2"
            aria-controls="settings-tabpanel-2"
          />
        </Tabs>
      </DialogTitle>
      <DialogContent dividers>
        <TabPanel value={currentTab} index={0}>
          <List>
            <ListItem>
              <ListItemText 
                primary="Dark Mode"
                secondary="Enable dark theme for the application"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Notifications"
                secondary="Enable desktop notifications for tasks"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Auto Start"
                secondary="Start application on system startup"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={autoStart}
                    onChange={(e) => setAutoStart(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
            </ListItem>
          </List>
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Whisper Speech Recognition
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleLoadWhisperModel}
              disabled={whisperLoading}
              sx={{ mr: 2 }}
            >
              {whisperLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  {loadingMessage} ({loadingProgress}%)
                </>
              ) : (
                'Load Whisper Model'
              )}
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestWhisper}
              disabled={whisperLoading || !whisperWorkerRef.current || (!isModelReady && !isRecording)}
              color={isRecording ? "error" : "primary"}
              startIcon={whisperLoading ? <CircularProgress size={20} /> : isRecording ? <StopIcon /> : <MicIcon />}
            >
              {whisperLoading ? loadingMessage : isRecording ? 'Stop Recording' : 'Test Speech Recognition'}
            </Button>
            {whisperError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {whisperError}
              </Alert>
            )}
          </Box>
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default Settings;
