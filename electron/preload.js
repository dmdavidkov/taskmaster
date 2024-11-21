const { contextBridge, ipcRenderer } = require('electron');

// Helper function for event subscriptions
const createSubscription = (channel, callback) => {
  const subscription = (...args) => callback(...args);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
};

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
  env: {
    REACT_APP_NEBIUS_API_KEY: process.env.REACT_APP_NEBIUS_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'production'
  },
  ai: {
    processText: (params) => ipcRenderer.invoke('ai:processText', params),
    testConnection: (config) => ipcRenderer.invoke('ai:testConnection', config)
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
  },
  preferences: {
    get: (key) => ipcRenderer.invoke('preferences:get', key),
    set: (key, value) => ipcRenderer.invoke('preferences:set', key, value),
    getAll: () => ipcRenderer.invoke('preferences:getAll'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window-control', 'minimize'),
    maximize: () => ipcRenderer.invoke('window-control', 'maximize'),
    close: () => ipcRenderer.invoke('window-control', 'close'),
  }
});
