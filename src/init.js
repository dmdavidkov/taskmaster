import useWhisperStore from './stores/whisperStore';

export const initializeApp = async () => {
  const whisperStore = useWhisperStore.getState();
  
  // Only initialize worker if not already initialized
  if (!whisperStore.worker) {
    whisperStore.initializeWorker();
  }
  
  // Use the store's state for auto-load check
  if (whisperStore.autoLoadModel && !whisperStore.isModelLoaded && !whisperStore.isLoading) {
    // Load the model
    await whisperStore.loadModel();
  }
  
  // Add cleanup on app shutdown
  window.addEventListener('beforeunload', () => {
    whisperStore.cleanup();
  });
};
