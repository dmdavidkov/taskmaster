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
      
      initializeWorker: () => {
        // Reset model state on worker initialization
        set({ isModelLoaded: false, isLoading: false, error: null });
        
        if (!get().worker) {
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
              }
            };
            
            set({ worker });
          } catch (error) {
            console.error('Error initializing worker:', error);
            set({ error: error.message, isLoading: false });
          }
        }
      },

      loadModel: async () => {
        const { worker, isModelLoaded, isLoading, modelConfig } = get();
        
        // Don't load if already loaded or loading
        if (isModelLoaded || isLoading) return;

        // Check if we have a worker
        if (!worker) {
          set({ error: 'Worker not initialized. Please refresh the page.' });
          return;
        }

        set({ isLoading: true, error: null, loadingProgress: {} });
        
        // Convert config to worker format
        const workerConfig = {
          model_id: modelConfig.modelId,
          encoder_model: modelConfig.encoderModel,
          decoder_model_merged: modelConfig.decoderModel
        };
        
        worker.postMessage({ 
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
          autoLoadModel: false
        });
      }
    }),
    {
      name: 'whisper-storage',
      partialize: (state) => ({
        modelConfig: state.modelConfig,
        isModelLoaded: state.isModelLoaded,
        autoLoadModel: state.autoLoadModel,
        selectedLanguage: state.selectedLanguage
      })
    }
  )
);

export default useWhisperStore;
