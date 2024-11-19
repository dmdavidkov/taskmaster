import useWhisperStore from './stores/whisperStore';

export const initializeApp = async () => {
  const whisperStore = useWhisperStore.getState();
  
  // Check if we should auto-load the model
  const shouldAutoLoad = localStorage.getItem('autoLoadWhisperModel') === 'true';
  if (shouldAutoLoad && whisperStore.hasCompletedSetup && !whisperStore.isModelLoaded) {
    // Initialize worker first
    whisperStore.initializeWorker();
    // Then load the model
    whisperStore.loadModel();
  }
  
  // Add cleanup on app shutdown
  window.addEventListener('beforeunload', () => {
    whisperStore.cleanup();
  });
};
