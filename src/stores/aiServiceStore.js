import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAIServiceStore = create(
  persist(
    (set, get) => ({
      config: {
        baseURL: 'https://api.studio.nebius.ai/v1/',
        apiKey: '',
        modelName: 'Qwen/Qwen2.5-72B-Instruct-fast',
        asrModel: '',
      },
      isConfigured: false,
      isLoading: false,
      error: null,
      testResult: null,

      setIsLoading: (loading) => set({ isLoading: loading }),
      setTestResult: (result) => set({ testResult: result }),
      setError: (error) => set({ error: error }),

      updateConfig: async ({ baseURL, apiKey, modelName, asrModel }) => {
        const newConfig = { ...get().config };
        
        if (baseURL !== undefined) {
          newConfig.baseURL = baseURL;
          await window.electron.preferences.set('aiService.baseURL', baseURL);
        }
        if (apiKey !== undefined) {
          newConfig.apiKey = apiKey;
          await window.electron.preferences.set('aiService.apiKey', apiKey);
        }
        if (modelName !== undefined) {
          newConfig.modelName = modelName;
          await window.electron.preferences.set('aiService.modelName', modelName);
        }
        if (asrModel !== undefined) {
          newConfig.asrModel = asrModel;
          await window.electron.preferences.set('aiService.asrModel', asrModel);
        }
        
        set({ config: newConfig, error: null });
        
        // Reinitialize the AI service
        try {
          await window.electron.ai.testConnection(newConfig);
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      initializeConfig: async () => {
        try {
          // Get all preferences at once
          const preferences = await Promise.all([
            window.electron.preferences.get('aiService.baseURL'),
            window.electron.preferences.get('aiService.apiKey'),
            window.electron.preferences.get('aiService.modelName'),
            window.electron.preferences.get('aiService.asrModel')
          ]);
          
          const [baseURL, apiKey, modelName, asrModel] = preferences;
          
          // Log the retrieved preferences
          console.log('Retrieved preferences:', {
            hasBaseURL: !!baseURL,
            hasApiKey: !!apiKey,
            hasModelName: !!modelName,
            hasASRModel: !!asrModel
          });
          
          const newConfig = {
            baseURL: baseURL || get().config.baseURL,
            apiKey: apiKey || get().config.apiKey,
            modelName: modelName || get().config.modelName,
            asrModel: asrModel || get().config.asrModel,
          };
          
          set({
            config: newConfig,
            isConfigured: !!newConfig.apiKey
          });

          // Save the complete config to electron-store
          await window.electron.preferences.set('aiService', newConfig);
          
        } catch (error) {
          console.error('Error initializing AI service config:', error);
          set({ error: error.message });
        }
      },

      testConnection: async (testConfig = null) => {
        set({ isLoading: true });
        try {
          // Use provided test config or current config
          const configToTest = testConfig || get().config;
          
          const response = await window.electron.ai.testConnection(configToTest);
          
          if (response.success) {
            set({ 
              isConfigured: true, 
              error: null,
              // Update the store config with the tested config if successful
              config: testConfig || get().config
            });
            return response;
          } else {
            set({ 
              error: response.message || 'Connection test failed', 
              isConfigured: false,
            });
            throw new Error(response.message || 'Connection test failed');
          }
        } catch (error) {
          set({ 
            error: error.message, 
            isConfigured: false,
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      resetConfig: async () => {
        const defaultConfig = {
          baseURL: 'https://api.studio.nebius.ai/v1/',
          apiKey: '',
          modelName: 'Qwen/Qwen2.5-72B-Instruct-fast',
          asrModel: '',
        };
        
        await window.electron.preferences.set('aiService.baseURL', defaultConfig.baseURL);
        await window.electron.preferences.set('aiService.apiKey', defaultConfig.apiKey);
        await window.electron.preferences.set('aiService.modelName', defaultConfig.modelName);
        await window.electron.preferences.set('aiService.asrModel', defaultConfig.asrModel);
        
        set({
          config: defaultConfig,
          isConfigured: false,
          error: null,
          testResult: null,
        });
      }
    }),
    {
      name: 'ai-service-storage',
    }
  )
);

// Initialize config when the store is created
if (typeof window !== 'undefined') {
    // Use window load event which ensures everything is ready
    window.addEventListener('load', () => {
        setTimeout(() => {
            useAIServiceStore.getState().initializeConfig();
        }, 100); // Small delay to ensure everything is properly initialized
    });
}

export default useAIServiceStore;
