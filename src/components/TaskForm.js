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
import useWhisperStore from '../stores/whisperStore';

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
  { value: 'low', label: 'Low Priority', color: 'success.main' },
  { value: 'medium', label: 'Medium Priority', color: 'warning.main' },
  { value: 'high', label: 'High Priority', color: 'error.main' },
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

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // Set to end of tomorrow
    return tomorrow;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: getTomorrowDate(),
    createdDate: null,
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
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate) : getTomorrowDate(),
        createdDate: task.createdDate ? new Date(task.createdDate) : task.createdDate,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        dueDate: getTomorrowDate(),
        createdDate: new Date()
      }));
    }
  }, [task]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const taskData = {
      ...formData,
      dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
    };

    if (task) {
      taskData.id = task.id;
      taskData.completed = task.completed;
      taskData.completedAt = task.completedAt;
    }

    onSubmit(taskData);
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
          <IconButton className="close-button" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
          <FormContent component="form" onSubmit={handleSubmit}>
            <Typography variant="h5">
              {task ? 'Edit Task' : 'New Task'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange('title')}
                error={!!errors.title}
                helperText={errors.title}
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => startRecording('title')}
                      disabled={!isModelLoaded || isRecording || isProcessing}
                      sx={{
                        color: isModelLoaded ? 'primary.main' : 'action.disabled',
                        '&.Mui-disabled': {
                          color: 'action.disabled',
                          pointerEvents: 'none'
                        }
                      }}
                    >
                      <MicIcon />
                    </IconButton>
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange('description')}
                error={!!errors.description}
                helperText={errors.description}
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => startRecording('description')}
                      disabled={!isModelLoaded || isRecording || isProcessing}
                      sx={{
                        color: isModelLoaded ? 'primary.main' : 'action.disabled',
                        '&.Mui-disabled': {
                          color: 'action.disabled',
                          pointerEvents: 'none'
                        }
                      }}
                    >
                      <MicIcon />
                    </IconButton>
                  ),
                }}
              />
            </Box>

            <TextField
              select
              label="Priority"
              value={formData.priority}
              onChange={handleChange('priority')}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            >
              {priorities.map((option) => (
                <MenuItem 
                  key={option.value} 
                  value={option.value}
                  sx={{ color: option.color }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <DateTimePicker
              label="Due Date"
              value={formData.dueDate}
              onChange={handleDateChange}
              slotProps={{ textField: { fullWidth: true } }}
              minDate={new Date()}
              format="Pp"
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

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              {task && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="contained"
                type="submit"
                color="primary"
              >
                {task ? 'Save Changes' : 'Create Task'}
              </Button>
            </Box>
          </FormContent>
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
