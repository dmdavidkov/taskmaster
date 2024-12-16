import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormHelperText,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import useAIServiceStore from '../../stores/aiServiceStore';

const AIServiceSettings = () => {
  const {
    config,
    updateConfig,
    testConnection,
    resetConfig,
    isLoading,
    error,
    testResult,
    isConfigured,
    setIsLoading,
    setTestResult,
  } = useAIServiceStore();

  const [localConfig, setLocalConfig] = useState(config);

  const handleInputChange = (field) => (event) => {
    setLocalConfig({ ...localConfig, [field]: event.target.value });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // First update the config and wait for it to complete
      await updateConfig(localConfig);
      // Then test the connection with the updated config
      const result = await testConnection(localConfig);  // Pass localConfig directly to ensure latest values
      if (result.success) {
        setTestResult('Connection test successful');
        setTimeout(() => setTestResult(null), 3000);
      }
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    resetConfig();
    setLocalConfig({
      baseURL: 'https://api.studio.nebius.ai/v1/',
      apiKey: '',
      modelName: 'Qwen/Qwen2.5-72B-Instruct-fast',
      asrModel: '',
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">AI Service Configuration</Typography>

      <FormControl fullWidth>
        <TextField
          label="Base URL"
          value={localConfig.baseURL}
          onChange={handleInputChange('baseURL')}
          error={!!error && !localConfig.baseURL}
          helperText={!localConfig.baseURL && "Base URL is required"}
        />
        <FormHelperText>The base URL for the AI service API</FormHelperText>
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label="API Key"
          value={localConfig.apiKey}
          onChange={handleInputChange('apiKey')}
          type="password"
          error={!!error && !localConfig.apiKey}
          helperText={!localConfig.apiKey && "API key is required"}
        />
        <FormHelperText>Your API key for authentication</FormHelperText>
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label="Model Name"
          value={localConfig.modelName}
          onChange={handleInputChange('modelName')}
          error={!!error && !localConfig.modelName}
          helperText={!localConfig.modelName && "Model name is required"}
        />
        <FormHelperText>The name of the AI model to use</FormHelperText>
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label="External ASR Model (Optional)"
          value={localConfig.asrModel || ''}
          onChange={handleInputChange('asrModel')}
          placeholder="e.g., whisper-large-v3"
        />
        <FormHelperText>
          Optional: Specify an external ASR model for speech recognition. Leave empty to use the default Whisper model.
        </FormHelperText>
      </FormControl>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {testResult && (
        <Alert severity="success">
          {testResult}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={isLoading}
          disabled={!localConfig.baseURL || !localConfig.apiKey || !localConfig.modelName}
        >
          Save and Test Connection
        </LoadingButton>
        <Button variant="outlined" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default AIServiceSettings;
