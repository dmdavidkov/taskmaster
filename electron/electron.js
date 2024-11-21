const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');
const store = new Store();

// Initialize store defaults for AI service if not already set
if (!store.get('aiService')) {
  store.set('aiService', {
    baseURL: 'https://api.studio.nebius.ai/v1/',
    apiKey: '',
    modelName: 'Qwen/Qwen2.5-72B-Instruct-fast'
  });
}

// Add store methods to window.webContents
const initializePreferences = (window) => {
  window.webContents.getPreference = (key) => {
    return store.get(`aiService.${key}`);
  };
  
  window.webContents.setPreference = (key, value) => {
    store.set(`aiService.${key}`, value);
  };
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
  process.exit(0);
}

// Load environment variables first
require('dotenv').config();

let mainWindow;
let updateCheckInProgress = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure logging only in development
if (isDev) {
  log.transports.file.level = 'debug';
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'debug';
}

// Get package.json for app version
const packageJson = require('../package.json');

// Initialize AI Service after app is ready
let aiService;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove default window frame
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webgl: true,
      enableWebSQL: false,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheck',
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true,
      devTools: true, // Enable DevTools capability
    },
    backgroundColor: '#ffffff',
  });

  // Initialize preferences for this window
  initializePreferences(mainWindow);

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src * 'unsafe-inline' 'unsafe-eval' blob:; " +
          "connect-src * 'unsafe-inline' data: blob:; " +
          "img-src * data: blob: 'unsafe-inline'; " +
          "frame-src *; " +
          "style-src * 'unsafe-inline';"
        ]
      }
    });
  });

  // Enable WebGPU and GPU features
  app.commandLine.appendSwitch('enable-unsafe-webgpu');
  app.commandLine.appendSwitch('enable-features', 'Vulkan,WebGPU,WebGPUDeveloperFeatures');
  app.commandLine.appendSwitch('use-vulkan');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-webgpu-developer-features');
  app.commandLine.appendSwitch('enable-dawn-features', 'allow_unsafe_apis');

  // Remove the menu bar completely
  const Menu = require('electron').Menu;
  Menu.setApplicationMenu(null);

  // Load the app
  const startUrl = isDev 
    ? process.env.ELECTRON_START_URL || 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  log.info('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl)
    .catch(err => {
      log.error('Failed to load URL:', err);
      app.quit();
    });

  // Open DevTools in development after window is loaded
  if (isDev) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.openDevTools();
    });
  }

  // Add keyboard shortcut to toggle DevTools in any environment
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+Shift+I (or Cmd+Shift+I on macOS) to toggle DevTools
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Optimize memory usage
  mainWindow.on('minimize', () => {
    if (!isDev) {
      mainWindow.webContents.session.clearCache();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize AI service first
  try {
    aiService = require('./services/aiService');
    // Only try to initialize if we have an API key
    const config = store.get('aiService');
    if (config && config.apiKey) {
      await aiService.initialize();
      log.info('AI Service initialized successfully');
    } else {
      log.info('AI Service initialization skipped - no API key configured');
    }
  } catch (error) {
    log.error('Failed to initialize AI service:', error);
  }
  
  createWindow();
  
  if (app.isPackaged) {
    // Auto-updater configuration
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'dmdavidkov',
      repo: 'taskmaster',
      private: false
    });

    // Set the artifact name format to match electron-builder.yml
    autoUpdater.artifactName = '${productName}.Setup.${version}.${ext}';

    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Configure update settings
    autoUpdater.channel = 'latest';
    autoUpdater.allowDowngrade = false;
    autoUpdater.forceDevUpdateConfig = true;

    // Only log update checks, don't show UI
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
      log.info('Current version:', app.getVersion());
      mainWindow?.webContents.send('update-checking');
    });

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err);
      log.error('Update config:', autoUpdater.updateConfigPath);
      updateCheckInProgress = false;
      mainWindow?.webContents.send('update-error', err?.message || err?.toString() || 'Unknown error');
      // Only show error dialog for non-404 errors (404 usually means no updates available)
      if (err.toString().indexOf('404') === -1) {
        dialog.showErrorBox('Error', 'There was a problem checking for updates. Please try again later.');
      }
    });

    autoUpdater.on('update-available', (info) => {
      if (!updateCheckInProgress) {
        log.info('Update available:', info);
        mainWindow?.webContents.send('update-available', info);
        updateCheckInProgress = true;
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      log.info('Download progress:', progressObj);
      mainWindow?.webContents.send('update-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      updateCheckInProgress = false;
      mainWindow?.webContents.send('update-downloaded', info);
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. The application will update and restart now.',
        buttons: ['Restart'],
        defaultId: 0
      }).then(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    });

    autoUpdater.on('update-not-available', () => {
      log.info('No updates available');
      updateCheckInProgress = false;
      mainWindow?.webContents.send('update-not-available');
    });

    // Handle update download request
    ipcMain.handle('download-update', async () => {
      try {
        log.info('Starting update download...');
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        log.error('Failed to download update:', error);
        return { 
          success: false, 
          error: error?.message || error?.toString() || 'Unknown error'
        };
      }
    });

    // Handle update check request
    ipcMain.handle('check-for-updates', async () => {
      try {
        if (!updateCheckInProgress) {
          log.info('Manually checking for updates...');
          await autoUpdater.checkForUpdates();
          return { success: true };
        }
        return { success: false, error: 'Update check already in progress' };
      } catch (error) {
        log.error('Failed to check for updates:', error);
        return { success: false, error: error.message };
      }
    });

    // Initial check
    setTimeout(() => {
      if (!updateCheckInProgress) {
        autoUpdater.checkForUpdates().catch(err => {
          log.error('Error checking for updates:', err);
          updateCheckInProgress = false;
        });
      }
    }, 10000); // Delay initial check by 10 seconds

    // Check periodically
    setInterval(() => {
      if (!updateCheckInProgress) {
        autoUpdater.checkForUpdates().catch(err => {
          log.error('Error checking for updates:', err);
          updateCheckInProgress = false;
        });
      }
    }, 24 * 60 * 60 * 1000); // Check once per day
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return packageJson.version;
});

ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('get-tasks', () => {
  return store.get('tasks') || [];
});

ipcMain.handle('add-task', (_, task) => {
  const tasks = store.get('tasks') || [];
  tasks.push(task);
  store.set('tasks', tasks);
  return task;
});

ipcMain.handle('update-task', (_, updatedTask) => {
  const tasks = store.get('tasks') || [];
  const index = tasks.findIndex(task => task.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = updatedTask;
    store.set('tasks', tasks);
    return updatedTask;
  }
  throw new Error('Task not found');
});

ipcMain.handle('delete-task', (_, taskId) => {
  const tasks = store.get('tasks') || [];
  const filteredTasks = tasks.filter(task => task.id !== taskId);
  store.set('tasks', filteredTasks);
  return taskId;
});

ipcMain.handle('save-tasks', (_, tasks) => {
  store.set('tasks', tasks);
  return true;
});

// Add IPC handlers for preferences
ipcMain.handle('preferences:get', (event, key) => {
  return store.get(`aiService.${key}`);
});

ipcMain.handle('preferences:set', (event, key, value) => {
  store.set(`aiService.${key}`, value);
});

ipcMain.handle('preferences:getAll', () => {
  return store.get('aiService');
});

// Window control handlers
ipcMain.handle('window-control', (_, command) => {
  if (!mainWindow) return;
  
  switch (command) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});

// Handle version request
ipcMain.on('get-version', (event) => {
  event.returnValue = packageJson.version;
});
