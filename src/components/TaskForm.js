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

const Backdrop = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
});

const FormContainer = styled('div')(({ theme }) => ({
  width: '45%',
  maxWidth: 'calc(100vw - 100px)',
  maxHeight: 'calc(100vh - 60px)',
  margin: theme.spacing(2),
  position: 'relative',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
  position: 'relative',
  maxHeight: 'calc(100vh - 80px)',
  overflowY: 'auto',
  padding: theme.spacing(4),
  '& .close-button': {
    position: 'absolute',
    right: theme.spacing(2),
    top: theme.spacing(2),
    zIndex: 1,
  },
}));

const FormContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  height: '100%',
  '& .MuiTextField-root': {
    fontSize: '1.1rem',
  },
  '& .MuiTypography-h5': {
    fontSize: '1.5rem',
    marginBottom: theme.spacing(2),
    paddingRight: theme.spacing(6),
  },
}));

const priorities = [
  { value: 'critical', label: 'Critical Priority', color: 'error.dark' },
  { value: 'high', label: 'High Priority', color: 'error.main' },
  { value: 'medium', label: 'Medium Priority', color: 'warning.main' },
  { value: 'low', label: 'Low Priority', color: 'success.main' },
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
    speechText: '',
    language: 'en'
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
    // Reset form after a small delay to ensure it's not visible
    setTimeout(() => {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: getTomorrowDate(),
        createdDate: null,
        speechText: '',
        language: 'en'
      });
      setErrors({});
    }, 200);
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
        title: task.title || '',
        description: task.description || '',
        priority: typeof task.priority === 'object' ? task.priority.level : (task.priority || 'medium'),
        dueDate: task.dueDate ? utcToZonedTime(new Date(task.dueDate), userTimezone) : getTomorrowDate(),
        createdDate: task.createdDate ? utcToZonedTime(new Date(task.createdDate), userTimezone) : null,
        speechText: task.metadata?.speechText || '',
        language: task.metadata?.language || 'en'
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
        speechText: '',
        language: 'en'
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
      dueDate: newValue
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

    // Convert dates to UTC before submitting
    const submissionData = {
      ...formData,
      dueDate: zonedTimeToUtc(formData.dueDate, userTimezone),
      createdDate: formData.createdDate ? zonedTimeToUtc(formData.createdDate, userTimezone) : null,
      metadata: {
        speechText: formData.speechText,
        language: formData.language
      }
    };

    onSubmit(submissionData);
    handleClose();
  };

  const handleVoiceClick = (field) => {
    setActiveVoiceField(field);
    setShowVoiceDialog(true);
  };

  const handleVoiceDialogClose = () => {
    setShowVoiceDialog(false);
    setActiveVoiceField(null);
  };

  const handleTranscriptionComplete = (text, language) => {
    setShowVoiceDialog(false);
    setFormData(prev => ({
      ...prev,
      [activeVoiceField]: text,
      language: language,
      ...(activeVoiceField === 'title' ? { speechText: text } : {})
    }));
    setActiveVoiceField(null);
  };

  return (
    <Backdrop onClick={handleClose}>
      <FormContainer>
        <StyledPaper 
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {task ? 'Edit Task' : 'New Task'}
              </Typography>
              {formData.speechText && formData.speechText.trim() !== '' && (
                <Tooltip
                  title={
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1 
                      }}>
                        <TranslateIcon fontSize="small" />
                        <Typography variant="caption" sx={{ 
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 'bold'
                        }}>
                          {formData.language.toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ 
                        whiteSpace: 'pre-wrap',
                        fontStyle: 'italic',
                        color: 'text.secondary'
                      }}>
                        "{formData.speechText}"
                      </Typography>
                    </Box>
                  }
                  placement="right"
                  arrow
                >
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: 'primary.main',
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    <RecordVoiceOverIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={handleChange('title')}
                error={Boolean(errors.title)}
                helperText={errors.title}
                fullWidth
                required
              />
              <Tooltip title={isWhisperReady ? "Record voice" : "Loading speech recognition..."}>
                <span>
                  <IconButton
                    onClick={() => handleVoiceClick('title')}
                    color="primary"
                    size="small"
                    disabled={!isWhisperReady}
                  >
                    <MicIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 2 }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange('description')}
                error={Boolean(errors.description)}
                helperText={errors.description}
                multiline
                rows={4}
              />
              <Tooltip title={isWhisperReady ? "Record voice" : "Loading speech recognition..."}>
                <span>
                  <IconButton
                    onClick={() => handleVoiceClick('description')}
                    color="primary"
                    size="small"
                    disabled={!isWhisperReady}
                    sx={{ mt: 1 }}
                  >
                    <MicIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <TextField
              select
              fullWidth
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange('priority')}
              margin="normal"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>

            <DateTimePicker
              label="Due Date"
              value={formData.dueDate}
              onChange={(newValue) => handleDateChange(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />

            {task && task.createdDate && (
              <TextField
                label="Created Date"
                type="datetime-local"
                value={formData.createdDate ? formData.createdDate.toISOString().slice(0, 16) : ''}
                InputProps={{
                  readOnly: true,
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              {task && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </Button>
              )}
              <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                >
                  {task ? 'Update' : 'Create'} Task
                </Button>
              </Box>
            </Box>
          </Box>
        </StyledPaper>
      </FormContainer>

      <VoiceRecordDialog
        open={showVoiceDialog}
        onClose={handleVoiceDialogClose}
        onTranscriptionComplete={handleTranscriptionComplete}
        autoStartRecording={true}
      />
    </Backdrop>
  );
};

export default TaskForm;
