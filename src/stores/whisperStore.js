import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAIServiceStore from './aiServiceStore';

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
        const state = get();
        const aiConfig = useAIServiceStore.getState().config;
        
        // If local model is loaded, use it regardless of external ASR configuration
        if (state.isModelLoaded) {
          console.log('🎤 Using local Whisper model for transcription');
          return state.transcribeLocal(audio, language);
        }
        
        // If local model is not loaded but external ASR is configured, use that
        if (aiConfig.asrModel && aiConfig.apiKey) {
          console.log('🌐 Using external ASR service for transcription', {
            model: aiConfig.asrModel,
            hasApiKey: !!aiConfig.apiKey
          });
          try {
            // Convert Float32Array to regular array
            const audioArray = Array.from(audio);
            
            // Convert to 16-bit PCM
            const pcmData = new Int16Array(audioArray.map(x => x * 32767));
            
            // Create WAV file header
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);
            
            // WAV header creation
            // "RIFF" chunk descriptor
            view.setUint32(0, 0x52494646, false); // "RIFF"
            view.setUint32(4, 36 + pcmData.length * 2, true); // file size
            view.setUint32(8, 0x57415645, false); // "WAVE"
            
            // "fmt " sub-chunk
            view.setUint32(12, 0x666D7420, false); // "fmt "
            view.setUint32(16, 16, true); // subchunk size
            view.setUint16(20, 1, true); // PCM audio format
            view.setUint16(22, 1, true); // mono channel
            view.setUint32(24, 16000, true); // sample rate
            view.setUint32(28, 16000 * 2, true); // byte rate
            view.setUint16(32, 2, true); // block align
            view.setUint16(34, 16, true); // bits per sample
            
            // "data" sub-chunk
            view.setUint32(36, 0x64617461, false); // "data"
            view.setUint32(40, pcmData.length * 2, true); // data size
            
            // Combine header and PCM data
            const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
            const wavBuffer = await wavBlob.arrayBuffer();
            
            // Call external ASR service
            const text = await window.electron.ai.transcribeAudio({
              audio: wavBuffer,
              language,
              model: aiConfig.asrModel
            });
            
            if (!text) {
              throw new Error('No transcription result received');
            }
            
            return text;
          } catch (error) {
            console.error('External ASR failed:', error);
            throw error;
          }
        }
        
        // No local model and no external ASR configured
        throw new Error('No transcription service available. Please either load the Whisper model or configure an external ASR service.');
      },

      transcribeLocal: async (audio, language) => {
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
