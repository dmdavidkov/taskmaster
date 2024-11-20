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
    });
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        AI Service Configuration
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Base URL"
          value={localConfig.baseURL}
          onChange={handleInputChange('baseURL')}
          margin="normal"
          fullWidth
          error={!!error && !localConfig.baseURL}
          helperText={!localConfig.baseURL && "Base URL is required"}
        />
        <FormHelperText>The base URL for the AI service API</FormHelperText>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="API Key"
          value={localConfig.apiKey}
          onChange={handleInputChange('apiKey')}
          margin="normal"
          fullWidth
          type="password"
          error={!!error && !localConfig.apiKey}
          helperText={!localConfig.apiKey && "API key is required"}
        />
        <FormHelperText>Your API key for authentication</FormHelperText>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <TextField
          label="Model Name"
          value={localConfig.modelName}
          onChange={handleInputChange('modelName')}
          margin="normal"
          fullWidth
          error={!!error && !localConfig.modelName}
          helperText={!localConfig.modelName && "Model name is required"}
        />
        <FormHelperText>The name of the AI model to use</FormHelperText>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {testResult && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {testResult}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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
