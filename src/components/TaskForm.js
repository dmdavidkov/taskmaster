import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import MenuItem from '@mui/material/MenuItem';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import Typography from '@mui/material/Typography';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import Tooltip from '@mui/material/Tooltip';
import useWhisperStore from '../stores/whisperStore';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import TranslateIcon from '@mui/icons-material/Translate';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import VoiceRecordDialog from './VoiceRecordDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FlagIcon from '@mui/icons-material/Flag';

const Backdrop = styled('div')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: alpha(theme.palette.background.default, 0.8),
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
}));

const FormContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: '600px',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
}));

const FormHeader = styled('div')(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.primary.dark, 0.15)
    : alpha(theme.palette.primary.light, 0.15),
}));

const FormContent = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const FormActions = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.palette.background.default,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    transition: 'none',
    '& fieldset': {
      transition: 'none',
    },
    '& input': {
      transition: 'none',
    },
    '& textarea': {
      transition: 'none',
    },
    '& label': {
      transition: 'none',
    },
  },
  '& .MuiInputLabel-root': {
    transition: 'none',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    transition: 'none',
  },
  '& .MuiInputAdornment-root': {
    marginLeft: 0,
  },
}));

const PriorityToggleButton = styled(ToggleButton)(({ theme, value }) => {
  const getColor = () => {
    switch (value) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.text.primary;
    }
  };

  const color = getColor();

  return {
    '&.MuiToggleButton-root': {
      border: 'none',
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1, 2),
      textTransform: 'capitalize',
      gap: theme.spacing(1),
      '&:hover': {
        backgroundColor: alpha(color, 0.1),
      },
      '&.Mui-selected': {
        backgroundColor: alpha(color, 0.15),
        color: color,
        '&:hover': {
          backgroundColor: alpha(color, 0.25),
        },
      },
    },
    '& .MuiSvgIcon-root': {
      fontSize: '1.2rem',
    },
  };
});

const DateTimePickerWrapper = styled('div')(({ theme }) => ({
  '& .MuiTextField-root': {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: 'none',
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

const InputField = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  marginBottom: theme.spacing(2),
  '& .MuiInputBase-root': {
    paddingRight: theme.spacing(6), // Make room for the mic button
  },
  '& .mic-button': {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1), // Fixed position from top instead of percentage
    zIndex: 1,
  },
  '& .MuiInputBase-multiline .mic-button': {
    top: theme.spacing(1), // Specific positioning for multiline inputs
  }
}));

const PrioritySection = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  flexWrap: 'wrap',
}));

const priorities = [
  { value: 'critical', label: 'Critical', color: 'error' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'low', label: 'Low', color: 'success' },
];

const TaskForm = ({ 
  task = null, 
  onSubmit, 
  onClose, 
  onDelete 
}) => {
  const { 
    worker,
    isModelLoaded,
    isLoading: whisperLoading,
    error: whisperError
  } = useWhisperStore();

  const isWhisperReady = isModelLoaded && !whisperLoading && !whisperError;

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // Set to end of tomorrow
    // Convert to UTC for storage
    return zonedTimeToUtc(tomorrow, userTimezone);
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: getTomorrowDate(),
    createdDate: null,
    completedDate: null,
    speechText: '',
    language: 'en',
    notified: false
  });

  const [errors, setErrors] = useState({});
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handlePriorityChange = (newPriority) => {
    setFormData(prev => ({
      ...prev,
      priority: newPriority
    }));
  };

  const handleBackdropClick = (e) => {
    // Prevent closing if voice dialog is open
    if (showVoiceDialog) {
      return;
    }
    handleClose();
  };

  // Load saved language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('whisperLanguage');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    if (task) {
      const newFormData = {
        id: task.id,
        title: task.title || '',
        description: task.description || '',
        priority: typeof task.priority === 'object' ? task.priority.level : (task.priority || 'medium'),
        dueDate: task.dueDate ? utcToZonedTime(new Date(task.dueDate), userTimezone) : getTomorrowDate(),
        createdDate: task.createdDate ? utcToZonedTime(new Date(task.createdDate), userTimezone) : null,
        completedDate: task.completedDate ? utcToZonedTime(new Date(task.completedDate), userTimezone) : null,
        speechText: task.metadata?.speechText || '',
        language: task.metadata?.language || 'en',
        notified: task.notified || false
      };
      // console.log('Setting form data from task:', newFormData);
      setFormData(newFormData);
    } else {
      const newFormData = {
        title: '',
        description: '',
        priority: 'medium',
        dueDate: getTomorrowDate(),
        createdDate: zonedTimeToUtc(new Date(), userTimezone),
        completedDate: null,
        speechText: '',
        language: 'en',
        notified: false
      };
      console.log('Setting initial form data:', newFormData);
      setFormData(newFormData);
    }
  }, [task, userTimezone]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDateChange = (newValue) => {
    setFormData(prev => ({
      ...prev,
      dueDate: newValue,
      notified: false
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Keep the date in UTC format
    const submissionData = {
      ...formData,
      dueDate: formData.dueDate.toISOString(),
      createdDate: formData.createdDate ? formData.createdDate.toISOString() : null,
      completedDate: formData.completedDate ? formData.completedDate.toISOString() : null,
      notified: formData.notified,
      metadata: {
        speechText: formData.speechText,
        language: formData.language
      }
    };

    onSubmit(submissionData);
    handleClose();
  };

  const handleTaskStatusToggle = async () => {
    if (task) {
      try {
        console.log('Toggling task status:', task.id, 'Current completed status:', task.completed);
        let updatedTask;
        if (task.completed) {
          console.log('Reopening task...');
          updatedTask = await window.electron.tasks.reopenTask(task.id);
          console.log('Task reopened:', updatedTask);
        } else {
          console.log('Completing task...');
          updatedTask = await window.electron.tasks.completeTask(task.id);
          console.log('Task completed:', updatedTask);
        }
        
        // Update the task in the parent component with all metadata
        onSubmit({
          ...updatedTask,
          dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate) : null,
          createdDate: updatedTask.createdDate ? new Date(updatedTask.createdDate) : null,
          completedDate: updatedTask.completedDate ? new Date(updatedTask.completedDate) : null,
          metadata: {
            ...updatedTask.metadata,
            speechText: formData.speechText,
            language: formData.language
          }
        });
        onClose();
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
  };

  const handleVoiceClick = (field) => {
    setActiveVoiceField(field);
    setShowVoiceDialog(true);
  };

  const handleVoiceDialogClose = () => {
    // Only close if we're not in the middle of recording/processing
    if (!showVoiceDialog) return;
    setShowVoiceDialog(false);
    // Keep the active field until transcription is complete
  };

  const handleTranscriptionComplete = (text, language) => {
    if (!activeVoiceField) return;
    
    setFormData(prev => ({
      ...prev,
      [activeVoiceField]: text,
      language: language,
      ...(activeVoiceField === 'title' ? { speechText: text } : {})
    }));
    
    setShowVoiceDialog(false);
    setActiveVoiceField(null);
  };

  const handleDelete = () => {
    onDelete(task.id);
  };

  return (
    <Dialog
        open={true}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        hideBackdrop
        disablePortal
        PaperProps={{
          sx: {
            m: 2,
            borderRadius: 2,
          }
        }}
        transitionDuration={0}
        slotProps={{
          backdrop: {
            timeout: 0,
          },
        }}
    >
        <FormContainer elevation={0}>
            <form onSubmit={handleSubmit}>
                <FormHeader>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {task ? 'Edit Task' : 'New Task'}
                        </Typography>
                        {formData.speechText && (
                            <Tooltip title={formData.speechText} placement="right">
                                <RecordVoiceOverIcon fontSize="small" color="primary" />
                            </Tooltip>
                        )}
                    </Box>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </FormHeader>

                <FormContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                        <StyledTextField
                            autoFocus
                            fullWidth
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange('title')}
                            error={!!errors.title}
                            helperText={errors.title}
                            InputProps={{
                              endAdornment: (
                                <IconButton
                                  onClick={() => handleVoiceClick('title')}
                                  edge="end"
                                >
                                  <MicIcon />
                                </IconButton>
                              ),
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <StyledTextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange('description')}
                            InputProps={{
                              endAdornment: (
                                <IconButton
                                  onClick={() => handleVoiceClick('description')}
                                  edge="end"
                                  sx={{ mt: 'auto', mb: 'auto' }}
                                >
                                  <MicIcon />
                                </IconButton>
                              ),
                            }}
                        />
                    </Box>

                    <DateTimePickerWrapper>
                        <DateTimePicker
                            label="Due Date"
                            value={formData.dueDate}
                            onChange={handleDateChange}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    fullWidth
                                    error={!!errors.dueDate}
                                    helperText={errors.dueDate}
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <AccessTimeIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </DateTimePickerWrapper>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Priority
                      </Typography>
                      <ToggleButtonGroup
                        value={formData.priority}
                        exclusive
                        onChange={(e, newPriority) => {
                          if (newPriority !== null) {
                            handlePriorityChange(newPriority);
                          }
                        }}
                        fullWidth
                        size="small"
                      >
                        <PriorityToggleButton value="low">
                          <FlagIcon /> Low
                        </PriorityToggleButton>
                        <PriorityToggleButton value="medium">
                          <FlagIcon /> Medium
                        </PriorityToggleButton>
                        <PriorityToggleButton value="high">
                          <FlagIcon /> High
                        </PriorityToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                </FormContent>

                <FormActions>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {task && (
                            <Tooltip title="Delete task">
                                <IconButton onClick={handleDelete} size="small" color="error">
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {task && (
                            <Button
                                onClick={handleTaskStatusToggle}
                                color={task.completed ? "primary" : "success"}
                                startIcon={task.completed ? <RefreshIcon /> : <CheckCircleIcon />}
                            >
                                {task.completed ? 'Reopen Task' : 'Complete'}
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            type="submit"
                            startIcon={task ? <SaveIcon /> : <AddIcon />}
                        >
                            {task ? 'Save Changes' : 'Add Task'}
                        </Button>
                    </Box>
                </FormActions>
            </form>
        </FormContainer>
        
        {showVoiceDialog && (
            <VoiceRecordDialog
                open={showVoiceDialog}
                onClose={handleVoiceDialogClose}
                onTranscriptionComplete={handleTranscriptionComplete}
            />
        )}
    </Dialog>
  );
};

export default TaskForm;
