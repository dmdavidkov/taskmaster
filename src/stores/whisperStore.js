import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWhisperStore = create(
  persist(
    (set, get) => ({
      worker: null,
      isModelLoaded: false,
      isLoading: false,
      error: null,
      loadingProgress: 0,
      hasCompletedSetup: false, // Track if user has completed initial setup
      modelConfig: {
        encoderModel: localStorage.getItem('whisperEncoderModel') || 'q4',
        decoderModel: localStorage.getItem('whisperDecoderModel') || 'q4',
        modelId: localStorage.getItem('whisperModelId') || 'onnx-community/whisper-large-v3-turbo',
      },
      
      initializeWorker: () => {
        if (!get().worker) {
          const worker = new Worker(
            new URL('../workers/whisperWorker.js', import.meta.url),
            { type: 'module' }
          );
          
          worker.onmessage = (e) => {
            const { status, error, progress, text } = e.data;
            
            switch (status) {
              case 'progress':
                set({ loadingProgress: progress || 0 });
                break;
              case 'ready':
                set({ 
                  isModelLoaded: true, 
                  isLoading: false, 
                  loadingProgress: 100,
                  error: null,
                  hasCompletedSetup: true // Mark setup as complete when model is ready
                });
                break;
              case 'error':
                set({ 
                  error, 
                  isLoading: false,
                  isModelLoaded: false 
                });
                break;
            }
          };
          
          set({ worker });
        }
      },

      loadModel: async () => {
        const { worker, isModelLoaded, isLoading, modelConfig } = get();
        
        // Don't load if already loaded or loading
        if (isModelLoaded || isLoading) return;
        
        if (!navigator.gpu) {
          set({ error: 'WebGPU is not available in your browser' });
          return;
        }

        // Initialize worker if not already initialized
        if (!worker) {
          get().initializeWorker();
        }

        // Get the worker again after potential initialization
        const currentWorker = get().worker;
        if (!currentWorker) {
          set({ error: 'Failed to initialize worker' });
          return;
        }

        set({ isLoading: true, error: null, loadingProgress: 0 });
        
        // Convert config to worker format
        const workerConfig = {
          model_id: modelConfig.modelId,
          encoder_model: modelConfig.encoderModel,
          decoder_model_merged: modelConfig.decoderModel
        };
        
        currentWorker.postMessage({ 
          type: 'load',
          config: workerConfig
        });
      },

      transcribe: async (audio, language) => {
        const { worker, isModelLoaded, hasCompletedSetup } = get();
        
        if (!hasCompletedSetup) {
          throw new Error('Please complete Whisper setup in Settings first');
        }
        
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

      cleanup: () => {
        const { worker } = get();
        if (worker) {
          worker.terminate();
          set({ 
            worker: null, 
            isModelLoaded: false,
            isLoading: false,
            error: null,
            loadingProgress: 0 
          });
        }
      },

      resetSetup: () => {
        const { worker } = get();
        if (worker) {
          worker.terminate();
        }
        set({ 
          worker: null,
          isModelLoaded: false,
          isLoading: false,
          error: null,
          loadingProgress: 0,
          hasCompletedSetup: false
        });
      }
    }),
    {
      name: 'whisper-storage',
      partialize: (state) => ({ 
        hasCompletedSetup: state.hasCompletedSetup 
      })
    }
  )
);

export default useWhisperStore;
