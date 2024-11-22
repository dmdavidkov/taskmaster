import useWhisperStore from './stores/whisperStore';

export const initializeApp = async () => {
  console.log('Initializing app...');
  const whisperStore = useWhisperStore.getState();
  
  console.log('Current whisperStore state:', {
    hasWorker: !!whisperStore.worker,
    isModelLoaded: whisperStore.isModelLoaded,
    isLoading: whisperStore.isLoading,
    autoLoadModel: whisperStore.autoLoadModel
  });

  // Only initialize worker if not already initialized
  if (!whisperStore.worker) {
    console.log('Initializing Whisper worker...');
    whisperStore.initializeWorker();
  } else if (whisperStore.autoLoadModel && !whisperStore.isModelLoaded && !whisperStore.isLoading) {
    console.log('Auto-loading model on app init...');
    await whisperStore.loadModel();
  }
  
  // Add cleanup on app shutdown
  window.addEventListener('beforeunload', () => {
    console.log('App shutting down, cleaning up...');
    whisperStore.cleanup();
  });
};
