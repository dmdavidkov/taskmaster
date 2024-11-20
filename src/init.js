import useWhisperStore from './stores/whisperStore';

export const initializeApp = async () => {
  const whisperStore = useWhisperStore.getState();
  
  // Only initialize worker if not already initialized
  if (!whisperStore.worker) {
    whisperStore.initializeWorker();
  }
  
  // Then check if we should auto-load the model
  const shouldAutoLoad = localStorage.getItem('autoLoadWhisperModel') === 'true';
  if (shouldAutoLoad && !whisperStore.isModelLoaded && !whisperStore.isLoading) {
    // Load the model
    await whisperStore.loadModel();
  }
  
  // Add cleanup on app shutdown
  window.addEventListener('beforeunload', () => {
    whisperStore.cleanup();
  });
};
