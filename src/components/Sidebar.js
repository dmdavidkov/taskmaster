import React, { useState, useEffect } from 'react';
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import TodayIcon from '@mui/icons-material/Today';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import FlagIcon from '@mui/icons-material/Flag';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { motion } from 'framer-motion'; 
import useWhisperStore from '../stores/whisperStore';
import { processTranscription } from '../services/taskExtractor';
import CircularProgress from '@mui/material/CircularProgress';
import SettingsIcon from '@mui/icons-material/Settings';
import Divider from '@mui/material/Divider';
import Settings from './Settings';

const drawerWidth = 280;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.default,
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    height: 'calc(100% - 32px)', // TitleBar height
    top: '32px',
  },
}));

const StyledListItem = styled(ListItem)(({ theme, selected }) => ({
  borderRadius: theme.shape.borderRadius,
  margin: '4px 8px',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  }),
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  '&.Mui-disabled': {
    color: alpha(theme.palette.text.primary, 0.3),
  },
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['background-color', 'box-shadow']),
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.common.white, 0.05)
        : alpha(theme.palette.common.black, 0.03),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}));

const menuItems = [
  { id: 'all', text: 'Open Tasks', icon: <AllInboxIcon /> },
  { id: 'today', text: 'Today', icon: <TodayIcon /> },
  { id: 'upcoming', text: 'Upcoming', icon: <UpcomingIcon /> },
  { id: 'priority', text: 'Priority', icon: <FlagIcon /> },
  { id: 'completed', text: 'Completed', icon: <DoneAllIcon /> },
];

const Sidebar = ({ 
  selectedTab = 'all',
  searchQuery = '',
  onTabChange,
  onSearchChange,
  onAddTask,
}) => {
  const [version, setVersion] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recorderRef = React.useRef(null);
  
  const { 
    transcribe,
    isModelLoaded,
    isLoading: whisperLoading,
    error: whisperError
  } = useWhisperStore();

  const isWhisperReady = isModelLoaded && !whisperLoading && !whisperError;

  // Get the selected language from localStorage
  const selectedLanguage = localStorage.getItem('whisperLanguage') || 'en';

  useEffect(() => {
    // Get app version on component mount
    if (window.electron?.app) {
      window.electron.app.getVersion().then(setVersion).catch(console.error);
    }
  }, []);

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const startRecording = async () => {
    if (!isWhisperReady) {
      alert('Please setup Whisper in Settings first');
      setSettingsOpen(true);
      return;
    }

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
    try {
      setIsProcessing(true);
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Convert ArrayBuffer to AudioBuffer then to Float32Array
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);
      
      // Pass the selected language to transcribe
      const text = await transcribe(audioData, selectedLanguage);
      if (text) {
        try {
          // Pass both the text and original language to processTranscription
          const taskData = await processTranscription(text, text, selectedLanguage);
          if (taskData && taskData.title) {
            onAddTask(taskData);
          } else {
            console.error('Invalid task data received:', taskData);
          }
        } catch (err) {
          console.error('Error processing transcription:', err);
        }
      }
      
      // Clean up audio context
      await audioContext.close();
    } catch (err) {
      console.error('Error processing audio:', err);
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
      setAudioChunks([]);
    }
  };

  return (
    <>
      <StyledDrawer
        variant="permanent"
        anchor="left"
        component={motion.div}
        initial={{ x: -drawerWidth }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          p: 2,
        }}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                fontWeight: 700,
                color: 'primary.main',
              }}
            >
              TaskMaster
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onAddTask()}
                fullWidth
                sx={{ borderRadius: 2 }}
              >
                Add Task
              </Button>
              <StyledIconButton
                color="primary"
                disabled={(!isWhisperReady && !isRecording) || isProcessing}
                onClick={isRecording ? stopRecording : startRecording}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isRecording ? 'error.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isRecording 
                      ? 'error.dark'
                      : 'action.hover',
                  },
                }}
              >
                {isProcessing ? (
                  <CircularProgress size={24} />
                ) : isRecording ? (
                  <StopIcon />
                ) : (
                  <MicIcon />
                )}
              </StyledIconButton>
            </Box>

            <SearchTextField
              fullWidth
              size="small"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <List component="nav">
            {menuItems.map(({ id, text, icon }) => (
              <StyledListItem
                key={id}
                button
                selected={selectedTab === id}
                onClick={() => onTabChange(id)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {icon}
                </ListItemIcon>
                <ListItemText 
                  primary={text}
                  primaryTypographyProps={{
                    fontWeight: selectedTab === id ? 600 : 400,
                  }}
                />
              </StyledListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1 }} />

          <Divider sx={{ my: 2 }} />
          
          <StyledListItem
            button
            onClick={handleSettingsClick}
            sx={{ mb: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </StyledListItem>

          <Typography 
            variant="caption" 
            color="text.secondary"
            align="center"
          >
            TaskMaster v{version}
          </Typography>
        </Box>
      </StyledDrawer>

      <Settings 
        open={settingsOpen} 
        onClose={handleSettingsClose}
      />
    </>
  );
};

export default Sidebar;
