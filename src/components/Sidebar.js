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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import VoiceRecordDialog from './VoiceRecordDialog';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const { 
    transcribe,
    isModelLoaded,
    isLoading: whisperLoading,
    error: whisperError,
    selectedLanguage 
  } = useWhisperStore();

  const isWhisperReady = isModelLoaded && !whisperLoading && !whisperError;

  const handleCloseSnackbar = () => {
    setNotification(null);
  };

  const showNotification = (message, severity = 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleSettingsClick = (tab = 0) => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleVoiceClick = () => {
    if (!isWhisperReady) {
      showNotification('Please wait for the speech recognition model to load.', 'info');
      return;
    }
    setIsVoiceDialogOpen(true);
  };

  const handleVoiceDialogClose = () => {
    setIsVoiceDialogOpen(false);
  };

  const handleTranscriptionComplete = async (text, language) => {
    try {
      const taskData = await processTranscription(text, text, language);
      if (taskData?.title) {
        onAddTask(taskData);
      }
    } catch (err) {
      console.error('Error processing task with LLM:', err);
      
      if (err.message?.includes('AI service not initialized')) {
        showNotification('Please configure the AI Service in Settings to use voice commands.');
        handleSettingsClick(1);
      } else if (err.message?.includes('authentication failed')) {
        showNotification('AI service authentication failed. Please check your API key in Settings.');
        handleSettingsClick(1);
      } else {
        showNotification(err.message);
      }
    }
    setIsVoiceDialogOpen(false);
  };

  useEffect(() => {
    // Get app version on component mount
    if (window.electron?.app) {
      window.electron.app.getVersion().then(setVersion).catch(console.error);
    }

    // Listen for global shortcut trigger
    const handleSpeechTrigger = () => {
      if (!isWhisperReady) {
        showNotification('Please wait for the speech recognition model to load.', 'info');
        return;
      }
      setIsVoiceDialogOpen(true);
    };

    // Add event listener for speech recognition trigger
    const eventHandler = (e) => {
      handleSpeechTrigger();
    };
    window.addEventListener('start-speech-recognition', eventHandler);

    return () => {
      window.removeEventListener('start-speech-recognition', eventHandler);
    };
  }, [isWhisperReady]);

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

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onAddTask()}
                fullWidth
                sx={{ borderRadius: 2 }}
              >
                Add Task
              </Button>
              <IconButton
                color="primary"
                onClick={handleVoiceClick}
                disabled={!isWhisperReady}
                sx={{ 
                  borderRadius: 2,
                  backgroundColor: theme => isWhisperReady ? theme.palette.action.hover : theme.palette.action.disabledBackground,
                  '&:hover': {
                    backgroundColor: theme => isWhisperReady ? theme.palette.action.selected : theme.palette.action.disabledBackground,
                  }
                }}
              >
                <MicIcon />
              </IconButton>
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

      <Snackbar
        open={notification?.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={notification?.severity}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
      
      <Settings 
        open={isSettingsOpen} 
        onClose={handleSettingsClose}
      />

      <VoiceRecordDialog
        open={isVoiceDialogOpen}
        onClose={handleVoiceDialogClose}
        onTranscriptionComplete={handleTranscriptionComplete}
        showLanguageSelect={false}
        autoStartRecording={true}
      />
    </>
  );
};

export default Sidebar;
