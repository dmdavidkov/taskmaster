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

const VoiceInputDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(3),
  },
}));

const RecordingIndicator = styled(Box)(({ theme }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: theme.palette.error.main,
  animation: 'pulse 1.5s ease-in-out infinite',
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(0.95)',
      opacity: 0.9,
    },
    '50%': {
      transform: 'scale(1.05)',
      opacity: 0.5,
    },
    '100%': {
      transform: 'scale(0.95)',
      opacity: 0.9,
    },
  },
}));

const SpeechTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    maxWidth: 400,
    fontSize: '0.875rem',
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[2],
    padding: theme.spacing(1.5),
    '& .language-tag': {
      display: 'inline-block',
      padding: '2px 6px',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      borderRadius: theme.shape.borderRadius,
      fontSize: '0.75rem',
      marginBottom: theme.spacing(1)
    }
  }
}));

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
    transcribe,
    hasCompletedSetup,
    error: whisperError
  } = useWhisperStore();

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState(null);
  const [recordingStream, setRecordingStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const recorderRef = React.useRef(null);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [showOriginalText, setShowOriginalText] = useState(false);

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
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: typeof task.priority === 'object' ? task.priority.level : (task.priority || 'medium'),
        dueDate: task.dueDate ? utcToZonedTime(new Date(task.dueDate), userTimezone) : getTomorrowDate(),
        createdDate: task.createdDate ? utcToZonedTime(new Date(task.createdDate), userTimezone) : null,
        speechText: task.metadata?.speechText || '',
        language: task.metadata?.language || 'en'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        dueDate: getTomorrowDate(),
        createdDate: zonedTimeToUtc(new Date(), userTimezone)
      }));
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

  const startRecording = async (field) => {
    if (!hasCompletedSetup || !isModelLoaded) {
      setShowSetupPrompt(true);
      return;
    }

    setRecordingFor(field);
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
        setTranscriptionError(null);
        const processingContext = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await processingContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);
        
        setAudioChunks([]);
        
        const text = await transcribe(audioData, selectedLanguage);
        
        if (recordingFor && text) {
          setFormData(prev => ({
            ...prev,
            [recordingFor]: text.trim()
          }));
          setRecordingFor(null);
        }

        await processingContext.close();
      } catch (err) {
        console.error('Error processing audio:', err);
        setTranscriptionError('Failed to process audio. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Backdrop onClick={handleClose}>
      <FormContainer>
        <StyledPaper 
          onClick={(e) => e.stopPropagation()}
          sx={{ visibility: isRecording || isProcessing ? 'hidden' : 'visible' }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {task ? 'Edit Task' : 'New Task'}
              </Typography>
              {formData.speechText && (
                <SpeechTooltip
                  title={
                    <Box>
                      <span className="language-tag">{formData.language.toUpperCase()}</span>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {formData.speechText}
                      </Typography>
                    </Box>
                  }
                  placement="right"
                >
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: 'text.secondary',
                      p: 0.5,
                      '&:hover': {
                        color: 'primary.main'
                      }
                    }}
                  >
                    <RecordVoiceOverIcon fontSize="small" />
                  </IconButton>
                </SpeechTooltip>
              )}
            </Box>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange('title')}
              error={Boolean(errors.title)}
              helperText={errors.title}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    color="primary"
                    onClick={() => startRecording('title')}
                    disabled={isRecording || !hasCompletedSetup || whisperLoading}
                  >
                    {isRecording && recordingFor === 'title' ? <StopIcon /> : <MicIcon />}
                  </IconButton>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange('description')}
              error={Boolean(errors.description)}
              helperText={errors.description}
              margin="normal"
              multiline
              rows={4}
              InputProps={{
                endAdornment: (
                  <IconButton
                    color="primary"
                    onClick={() => startRecording('description')}
                    disabled={isRecording || !hasCompletedSetup || whisperLoading}
                  >
                    {isRecording && recordingFor === 'description' ? <StopIcon /> : <MicIcon />}
                  </IconButton>
                ),
              }}
            />

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

      <VoiceInputDialog
        open={isRecording || isProcessing}
        onClose={() => {
          if (!isProcessing && !isRecording) {
            stopRecording();
          }
        }}
        keepMounted={false}
        disablePortal={false}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 2,
            py: 2
          }}>
            {isRecording ? (
              <>
                <RecordingIndicator />
                <Typography>
                  Recording {recordingFor === 'title' ? 'title' : 'description'}...
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                  tabIndex={0}
                >
                  Stop Recording
                </Button>
              </>
            ) : isProcessing && (
              <>
                <CircularProgress />
                <Typography>
                  Processing audio...
                </Typography>
              </>
            )}
            
            {transcriptionError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {transcriptionError}
              </Alert>
            )}
          </Box>
        </DialogContent>
      </VoiceInputDialog>
    </Backdrop>
  );
};

export default TaskForm;
