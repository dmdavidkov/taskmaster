const { contextBridge, ipcRenderer } = require('electron');

// Helper function for event subscriptions
const createSubscription = (channel, callback) => {
  console.log(`Creating subscription for channel: ${channel}`);
  const subscription = (...args) => {
    console.log(`Event received on channel ${channel}:`, ...args);
    callback(...args);
  };
  ipcRenderer.on(channel, subscription);
  return () => {
    console.log(`Removing subscription for channel: ${channel}`);
    ipcRenderer.removeListener(channel, subscription);
  };
};

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      const validChannels = [
        'react-mounted',
        // ... your other valid channels
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      throw new Error(`Invalid channel: ${channel}`);
    },
  },
  env: {
    REACT_APP_NEBIUS_API_KEY: process.env.REACT_APP_NEBIUS_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'production'
  },
  ai: {
    processText: (data) => ipcRenderer.invoke('ai:processText', data),
    testConnection: (config) => ipcRenderer.invoke('ai:testConnection', config),
    transcribeAudio: (data) => ipcRenderer.invoke('ai:transcribeAudio', data),
  },
  store: {
    get: (key) => ipcRenderer.invoke('get-store-value', key),
    set: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  },
  tasks: {
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    addTask: (task) => ipcRenderer.invoke('add-task', task),
    updateTask: (task) => ipcRenderer.invoke('update-task', task),
    deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
    saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
    completeTask: (taskId) => ipcRenderer.invoke('completeTask', taskId),
    reopenTask: (taskId) => ipcRenderer.invoke('reopenTask', taskId),
  },
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    onUpdateChecking: (callback) => createSubscription('update-checking', callback),
    onUpdateAvailable: (callback) => createSubscription('update-available', callback),
    removeUpdateAvailable: (callback) => ipcRenderer.removeListener('update-available', callback),
    onUpdateNotAvailable: (callback) => createSubscription('update-not-available', callback),
    onUpdateError: (callback) => createSubscription('update-error', callback),
    removeUpdateError: (callback) => ipcRenderer.removeListener('update-error', callback),
    onUpdateProgress: (callback) => createSubscription('update-progress', callback),
    removeUpdateProgress: (callback) => ipcRenderer.removeListener('update-progress', callback),
    onUpdateDownloaded: (callback) => createSubscription('update-downloaded', callback),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    signalReactMounted: () => ipcRenderer.invoke('react-mounted'),
  },
  preferences: {
    get: (key) => ipcRenderer.invoke('preferences:get', key),
    set: (key, value) => ipcRenderer.invoke('preferences:set', key, value),
    getAll: () => ipcRenderer.invoke('preferences:getAll'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setTheme: (theme) => ipcRenderer.invoke('settings:setTheme', theme),
    setNotifications: (level) => ipcRenderer.invoke('settings:setNotifications', level),
    setMinimizeToTray: (enabled) => ipcRenderer.invoke('settings:setMinimizeToTray', enabled),
    setAutoStart: (enabled) => ipcRenderer.invoke('settings:setAutoStart', enabled),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window-control', 'minimize'),
    maximize: () => ipcRenderer.invoke('window-control', 'maximize'),
    close: () => ipcRenderer.invoke('window-control', 'close'),
    minimizeToTray: () => ipcRenderer.invoke('window-control', 'minimizeToTray'),
    onUnloadWhisperModel: (callback) => createSubscription('unload-whisper-model', callback),
    onWindowRestored: (callback) => createSubscription('window-restored', callback),
  },
  notifications: {
    show: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
    test: () => ipcRenderer.invoke('test-notification')
  },
  onShowTask: (callback) => {
    ipcRenderer.on('show-task', (_, taskId) => callback(taskId));
  }
});
