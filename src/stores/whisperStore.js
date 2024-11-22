import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWhisperStore = create(
  persist(
    (set, get) => ({
      worker: null,
      isModelLoaded: false,
      isLoading: false,
      error: null,
      loadingProgress: {},  
      loadingStage: null,
      modelConfig: {
        encoderModel: localStorage.getItem('whisperEncoderModel') || 'q4',
        decoderModel: localStorage.getItem('whisperDecoderModel') || 'fp32',
        modelId: localStorage.getItem('whisperModelId') || 'onnx-community/whisper-large-v3-turbo',
      },
      selectedLanguage: localStorage.getItem('whisperLanguage') || 'en',
      autoLoadModel: localStorage.getItem('autoLoadWhisperModel') === 'true',
      keepModelLoaded: localStorage.getItem('keepModelLoaded') === 'true',
      
      initializeWorker: () => {
        // Reset model state on worker initialization
        set({ isModelLoaded: false, isLoading: false, error: null });
        
        try {
          const worker = new Worker(
            new URL('../workers/whisperWorker.js', import.meta.url),
            { type: 'module' }
          );
          
          // Set up error handler
          worker.onerror = (error) => {
            console.error('Worker initialization error:', error);
            set({ error: error.message, isLoading: false });
          };

          // Handle worker termination
          worker.onmessageerror = (event) => {
            console.error('Worker message error:', event);
            set({ error: 'Worker communication error', isLoading: false });
          };
          
          worker.onmessage = (e) => {
            const { status, error, progress, stage, file, total, loaded } = e.data;
            
            switch (status) {
              case 'progress':
                if (file) {
                  // Update progress for specific file
                  set(state => ({
                    loadingProgress: {
                      ...state.loadingProgress,
                      [file]: {
                        progress: progress || 0,
                        total,
                        loaded
                      }
                    },
                    loadingStage: stage || 'initializing'
                  }));
                } else {
                  // Handle non-file specific progress
                  set({ 
                    loadingProgress: { '_overall': { progress: progress || 0 } },
                    loadingStage: stage || 'initializing'
                  });
                }
                break;
              case 'ready':
                set({ 
                  isModelLoaded: true, 
                  isLoading: false, 
                  loadingProgress: {},
                  loadingStage: null,
                  error: null
                });
                break;
              case 'error':
                set({ 
                  error, 
                  isLoading: false,
                  isModelLoaded: false,
                  loadingStage: null,
                  loadingProgress: {}
                });
                break;
              case 'unloaded':
                set({
                  isModelLoaded: false,
                  isLoading: false,
                  error: null,
                  loadingProgress: {},
                  loadingStage: null
                });
                break;
            }
          };
          
          set({ worker });

          // Listen for unload-whisper-model event
          window.electron.window.onUnloadWhisperModel(() => {
            const state = get();
            if (state.worker && state.isModelLoaded) {
              state.unloadModel();
            }
          });

          // Listen for window-restored event
          window.electron.window.onWindowRestored(() => {
            console.log('Window restored event received');
            const state = get();
            console.log('Current state:', {
              autoLoadModel: state.autoLoadModel,
              isModelLoaded: state.isModelLoaded,
              isLoading: state.isLoading,
              hasWorker: !!state.worker
            });
            
            if (!state.worker) {
              console.log('Worker not found, initializing...');
              state.initializeWorker();
            }
            
            // Get fresh state after potential worker initialization
            const currentState = get();
            if (currentState.autoLoadModel && !currentState.isModelLoaded && !currentState.isLoading) {
              console.log('Triggering model load after window restore');
              setTimeout(() => {
                const finalState = get();
                if (finalState.autoLoadModel && !finalState.isModelLoaded && !finalState.isLoading) {
                  console.log('Executing delayed model load');
                  finalState.loadModel();
                } else {
                  console.log('State changed during delay, skipping load:', {
                    autoLoadModel: finalState.autoLoadModel,
                    isModelLoaded: finalState.isModelLoaded,
                    isLoading: finalState.isLoading
                  });
                }
              }, 1500); // Increased delay to ensure window is fully ready
            } else {
              console.log('Skipping auto-load:', {
                autoLoadModel: currentState.autoLoadModel,
                isModelLoaded: currentState.isModelLoaded,
                isLoading: currentState.isLoading
              });
            }
          });

        } catch (error) {
          console.error('Error initializing worker:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      loadModel: async () => {
        const state = get();
        const { worker, isModelLoaded, isLoading } = state;
        
        console.log('loadModel called:', { isModelLoaded, isLoading, hasWorker: !!worker });
        
        // Don't load if already loaded or loading
        if (isModelLoaded || isLoading) {
          console.log('Model already loaded or loading, skipping');
          return;
        }

        // Initialize worker if not exists
        if (!worker) {
          console.log('No worker found, initializing new worker');
          state.initializeWorker();
        }

        // Get the latest worker state
        const currentWorker = get().worker;
        if (!currentWorker) {
          console.log('Worker initialization failed');
          set({ error: 'Worker not initialized. Please try again.' });
          return;
        }

        console.log('Starting model load process');
        set({ isLoading: true, error: null, loadingProgress: {} });
        
        // Convert config to worker format
        const workerConfig = {
          model_id: state.modelConfig.modelId,
          encoder_model: state.modelConfig.encoderModel,
          decoder_model_merged: state.modelConfig.decoderModel
        };
        
        currentWorker.postMessage({ 
          type: 'load',
          config: workerConfig
        });
      },

      transcribe: async (audio, language) => {
        const { worker, isModelLoaded } = get();
        
        if (!worker || !isModelLoaded) {
          throw new Error('Whisper model not initialized');
        }

        return new Promise((resolve, reject) => {
          const messageHandler = (e) => {
            const { status, error, text } = e.data;
            
            if (status === 'complete') {
              worker.removeEventListener('message', messageHandler);
              resolve(text);
            } else if (status === 'error') {
              worker.removeEventListener('message', messageHandler);
              reject(new Error(error));
            }
          };

          worker.addEventListener('message', messageHandler);
          worker.postMessage({ 
            type: 'transcribe',
            audio,
            language,
          });
        });
      },

      updateModelConfig: ({ encoderModel, decoderModel, modelId }) => {
        const newConfig = { ...get().modelConfig };
        
        if (encoderModel !== undefined) {
          newConfig.encoderModel = encoderModel;
          localStorage.setItem('whisperEncoderModel', encoderModel);
        }
        if (decoderModel !== undefined) {
          newConfig.decoderModel = decoderModel;
          localStorage.setItem('whisperDecoderModel', decoderModel);
        }
        if (modelId !== undefined) {
          newConfig.modelId = modelId;
          localStorage.setItem('whisperModelId', modelId);
        }
        
        set({ modelConfig: newConfig });
        
        // Reset model state if config changes and model is loaded
        const { isModelLoaded } = get();
        if (isModelLoaded) {
          get().resetSetup();
        }
      },

      updateLanguage: (language) => {
        localStorage.setItem('whisperLanguage', language);
        set({ selectedLanguage: language });
      },

      updateAutoLoadModel: (autoLoadModel) => {
        set({ autoLoadModel });
        localStorage.setItem('autoLoadWhisperModel', autoLoadModel);
      },

      updateKeepModelLoaded: (keepLoaded) => {
        localStorage.setItem('keepModelLoaded', keepLoaded);
        set({ keepModelLoaded: keepLoaded });
      },

      unloadModel: async () => {
        const { worker, isModelLoaded, keepModelLoaded } = get();
        
        // Check if we should unload the model
        if (keepModelLoaded) {
          console.log('Keeping model loaded due to user preference');
          return;
        }

        if (worker) {
          // Send unload message first
          if (isModelLoaded) {
            worker.postMessage({ type: 'unload' });
          }
          // Terminate worker
          worker.terminate();
          set({ worker: null, isModelLoaded: false, isLoading: false, error: null, loadingProgress: {} });
        }
      },

      cleanup: () => {
        const { worker } = get();
        if (worker) {
          worker.terminate();
          set({ 
            worker: null, 
            isModelLoaded: false,
            isLoading: false,
            error: null,
            loadingProgress: {} 
          });
        }
      },

      resetSetup: () => {
        const worker = get().worker;
        if (worker) {
          worker.terminate();
        }
        
        localStorage.removeItem('whisperEncoderModel');
        localStorage.removeItem('whisperDecoderModel');
        localStorage.removeItem('whisperModelId');
        localStorage.removeItem('whisperLanguage');
        
        set({
          worker: null,
          isModelLoaded: false,
          isLoading: false,
          error: null,
          loadingProgress: {},
          loadingStage: null,
          modelConfig: {
            encoderModel: 'q4',
            decoderModel: 'fp32',
            modelId: 'onnx-community/whisper-large-v3-turbo',
          },
          selectedLanguage: 'en',
          autoLoadModel: false,
          keepModelLoaded: false
        });
      }
    }),
    {
      name: 'whisper-storage',
      partialize: (state) => ({
        modelConfig: state.modelConfig,
        selectedLanguage: state.selectedLanguage,
        autoLoadModel: state.autoLoadModel,
        keepModelLoaded: state.keepModelLoaded,
      }),
    }
  )
);

export default useWhisperStore;
