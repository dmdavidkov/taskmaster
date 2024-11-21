import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

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

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getLoadingMessage = (progress, stage) => {
  if (stage === 'downloading') {
    if (progress._cached) {
      return 'Loading model from cache...';
    }

    const files = Object.entries(progress)
      .filter(([_, data]) => 
        data.total > 0 && 
        data.loaded > 0 && 
        !data.cached && 
        data.loaded !== data.total
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

const ModelSettings = ({
  modelConfig,
  updateModelConfig,
  autoLoadModel,
  onAutoLoadChange,
  isModelLoaded,
  whisperLoading,
  whisperError,
  loadingProgress,
  loadingStage,
  onLoadModel,
  onResetSetup
}) => {
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

  const menuProps = {
    PaperProps: {
      sx: {
        maxHeight: 300,
        '&::-webkit-scrollbar': {
          width: '8px',
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme => theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.2)' 
            : 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: theme => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(0, 0, 0, 0.3)',
          },
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        scrollbarWidth: 'thin',
        scrollbarColor: theme => `${theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.2)' 
          : 'rgba(0, 0, 0, 0.2)'} transparent`,
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Model Configuration</Typography>
      
      <FormControl size="small" fullWidth>
        <InputLabel>Model</InputLabel>
        <Select
          value={modelConfig.modelId}
          onChange={(e) => updateModelConfig({ modelId: e.target.value })}
          label="Model"
          MenuProps={menuProps}
        >
          {MODEL_OPTIONS.models.map((model) => (
            <MenuItem key={model.value} value={model.value}>
              {model.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Select the Whisper model variant to use</FormHelperText>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel>Encoder Quantization</InputLabel>
        <Select
          value={modelConfig.encoderModel}
          onChange={(e) => updateModelConfig({ encoderModel: e.target.value })}
          label="Encoder Quantization"
          MenuProps={menuProps}
        >
          {MODEL_OPTIONS.quantization.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Choose the quantization level for the encoder</FormHelperText>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel>Decoder Quantization</InputLabel>
        <Select
          value={modelConfig.decoderModel}
          onChange={(e) => updateModelConfig({ decoderModel: e.target.value })}
          label="Decoder Quantization"
          MenuProps={menuProps}
        >
          {MODEL_OPTIONS.quantization.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Choose the quantization level for the decoder</FormHelperText>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button
          variant="contained"
          onClick={onLoadModel}
          disabled={whisperLoading || isModelLoaded}
          size="small"
        >
          Load Model
        </Button>
        <Button
          variant="outlined"
          onClick={onResetSetup}
          disabled={whisperLoading}
          size="small"
        >
          Reset Setup
        </Button>
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={autoLoadModel}
            onChange={onAutoLoadChange}
            disabled={whisperLoading}
          />
        }
        label="Auto-load model on startup"
        sx={{ mt: 1 }}
      />

      {renderModelStatus()}
    </Box>
  );
};

export default ModelSettings;
