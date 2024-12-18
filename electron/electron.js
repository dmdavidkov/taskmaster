const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');
const taskService = require('./services/taskService');
const settingsService = require('./services/settingsService');
const store = new Store();

// Set app metadata before anything else
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setPath('userData', path.join(app.getPath('userData'), 'Task Master'));
  }
} else {
  app.setPath('userData', path.join(app.getPath('userData'), 'Task Master'));
}

// Set app name and other metadata
app.setName('Task Master');
app.setAppUserModelId('com.taskmaster.app');

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
let tray = null;
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

// Initialize all IPC handlers before creating window
function initializeIpcHandlers() {
  // Window control handlers
  ipcMain.handle('window-control', (event, command) => {
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
        const settings = settingsService.getSettings();
        const shouldMinimizeToTray = settings?.minimizeToTray;
        
        if (shouldMinimizeToTray) {
          minimizeToTray();
        } else {
          mainWindow.close();
        }
        break;
      case 'minimize-to-tray':
        minimizeToTray();
        // Ensure tray exists
        if (!tray) {
          createTray();
        }
        break;
    }
  });

  // Task handlers
  ipcMain.handle('get-tasks', () => taskService.getTasks());
  ipcMain.handle('add-task', (_, task) => taskService.addTask(task));
  ipcMain.handle('update-task', (_, task) => taskService.updateTask(task));
  ipcMain.handle('delete-task', (_, taskId) => taskService.deleteTask(taskId));
  ipcMain.handle('save-tasks', (_, tasks) => taskService.saveTasks(tasks));

  // Expose task service methods
  ipcMain.handle('completeTask', async (event, taskId) => {
    return await taskService.completeTask(taskId);
  });

  ipcMain.handle('reopenTask', async (event, taskId) => {
    return await taskService.reopenTask(taskId);
  });

  // Store handlers
  ipcMain.handle('get-store-value', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('set-store-value', (event, key, value) => {
    store.set(key, value);
  });

  // Preference handlers
  ipcMain.handle('preferences:get', (event, key) => {
    return store.get(`aiService.${key}`);
  });

  ipcMain.handle('preferences:set', (event, key, value) => {
    store.set(`aiService.${key}`, value);
  });

  ipcMain.handle('preferences:getAll', () => {
    return store.get('aiService');
  });

  // Notification handlers
  ipcMain.handle('show-notification', (_, { title, body }) => {
    taskService.showNotification(title, body);
  });

  ipcMain.handle('test-notification', () => {
    taskService.testNotification();
  });

  // Version handlers
  ipcMain.handle('get-app-version', () => {
    return packageJson.version;
  });

  ipcMain.on('get-version', (event) => {
    event.returnValue = packageJson.version;
  });

  // Update handlers
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

  // Speech recognition trigger handler
  ipcMain.handle('trigger-speech-recognition', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('start-speech-recognition');
    }
  });

  // Handle notification clicks
  ipcMain.on('notification-clicked', (_, taskId) => {
    log.info('Handling notification click for task:', taskId);
    
    // Show and focus the window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      
      // Send event to renderer to show the task
      mainWindow.webContents.send('show-task', taskId);
    } else {
      log.error('Main window not available');
      createWindow().then(() => {
        mainWindow.webContents.send('show-task', taskId);
      });
    }
  });

  // Handle window show event
  ipcMain.handle('window-restored', () => {
    log.info('Window restored event received');
    mainWindow.webContents.send('window-restored');
  });

  // Handle model unload check
  ipcMain.handle('should-unload-model', () => {
    const keepModelLoaded = store.get('keepModelLoaded', false);
    return !keepModelLoaded;
  });

  // Add this with your other IPC handlers
  ipcMain.handle('react-mounted', () => {
    log.info('React app mounted');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        document.documentElement.classList.add('react-mounted');
      `);
    }
  });

  // Add new handler for app ready state
  ipcMain.handle('app:isReady', () => {
    return app.isReady();
  });
}

// Add this function to get theme background color
function getThemeBackgroundColor(themeName) {
  const themeColors = {
    light: '#ffffff',
    dark: '#121212',
    purple: '#1a121c',
    purpleMist: '#F0EDF1',
    ocean: '#e0f7fa',
    sunset: '#1a0f0f',
    forest: '#f1f8e9',
    dreamscape: '#1a1a2e',
  };
  
  // Handle system theme differently using nativeTheme
  if (themeName === 'system') {
    const { nativeTheme } = require('electron');
    return nativeTheme.shouldUseDarkColors ? '#121212' : '#ffffff';
  }
  
  return themeColors[themeName] || themeColors.light;
}

function initializeSettingsHandlers() {
  ipcMain.handle('settings:get', () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('settings:setTheme', async (_, theme) => {
    const result = await settingsService.setTheme(theme);
    // Update window background color when theme changes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(getThemeBackgroundColor(theme));
    }
    return result;
  });

  ipcMain.handle('settings:setNotifications', (_, level) => {
    return settingsService.setNotifications(level);
  });

  ipcMain.handle('settings:setMinimizeToTray', (_, enabled) => {
    return settingsService.setMinimizeToTray(enabled);
  });

  ipcMain.handle('settings:setAutoStart', (_, enabled) => {
    return settingsService.setAutoStart(enabled);
  });
  
}

function scheduleNextMinuteCheck() {
  const now = new Date();
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0);
  nextMinute.setMilliseconds(0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);
  
  const delay = nextMinute.getTime() - now.getTime();
  return setTimeout(() => {
    checkTaskDueDates();
    // Schedule next check
    scheduleNextMinuteCheck();
  }, delay);
}

function checkTaskDueDates() {
  const now = new Date();
  const tasks = store.get('tasks') || [];
  
  tasks.forEach(task => {
    // Skip completed tasks
    if (task.completed) return;
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      // Set seconds and milliseconds to 0 for exact minute comparison
      dueDate.setSeconds(0);
      dueDate.setMilliseconds(0);
      
      const currentMinute = new Date(now);
      currentMinute.setSeconds(0);
      currentMinute.setMilliseconds(0);
      
      // Only notify if:
      // 1. Current minute exactly matches the due minute
      // 2. Task hasn't been notified before
      // 3. Task is not completed
      if (dueDate.getTime() === currentMinute.getTime() && !task.notified) {
        showNotification('Task Master', `Task "${task.title}" is due now!`);
        
        // Mark task as notified
        const updatedTasks = tasks.map(t => 
          t.id === task.id ? { ...t, notified: true } : t
        );
        store.set('tasks', updatedTasks);
      }
    }
  });
}

function minimizeToTray() {
  log.info('Minimizing to tray');
  mainWindow.hide();
  
  // Only send unload-whisper-model if keepModelLoaded is false
  const keepModelLoaded = store.get('keepModelLoaded', false);
  if (!keepModelLoaded) {
    mainWindow.webContents.send('unload-whisper-model');
  }
}

function handleWindowShow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info('Window shown');
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  }
}

function createTray() {
  if (tray) return; // Prevent multiple tray instances

  let iconPath;
  if (app.isPackaged) {
    // In production, use the extraResources path
    iconPath = path.join(process.resourcesPath, 'assets/icon.png');
  } else {
    // In development, use the relative path
    iconPath = path.join(__dirname, '../assets/icon.png');
  }

  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            log.info('Restoring window from tray...');
            handleWindowShow();
          }
        }
      },
      {
        label: 'Exit',
        click: () => {
          // Stop any running services
          if (taskService) {
            taskService.stopTaskChecking();
          }
          // Destroy the tray icon
          if (tray) {
            tray.destroy();
          }
          // Close the main window if it exists
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
          }
          // Quit the application
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Task Master');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        handleWindowShow();
      }
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
    // Log the attempted icon path
    console.error('Attempted icon path:', iconPath);
  }
}

function showNotification(title, body) {
  new Notification({
    title: title,
    body: body,
    icon: path.join(__dirname, '../assets/icon.png')
  }).show();
}

function createWindow() {
  // Get current theme from settings
  const settings = settingsService.getSettings();
  const currentTheme = settings?.theme || 'system';
  const backgroundColor = getThemeBackgroundColor(currentTheme);
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
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
      devTools: true,
    },
    backgroundColor: backgroundColor,
  });

  // Initialize preferences for this window
  initializePreferences(mainWindow);

  // Inject CSS before any content loads
  mainWindow.webContents.on('did-start-loading', () => {
    mainWindow.webContents.insertCSS(`
      html, body, #root {
        background: ${backgroundColor} !important;
      }
    `);
  });

  // Show window when everything is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

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
  mainWindow.on('minimize', (event) => {
    // Don't prevent default minimize behavior
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Unregister global shortcut when window is closed
    globalShortcut.unregister('Alt+Shift+T');
  });

  // Handle window state
  let isQuitting = false;

  app.on('before-quit', () => {
    isQuitting = true;
    // Unregister global shortcut before quitting
    globalShortcut.unregister('Alt+Shift+T');
  });

  mainWindow.on('close', (event) => {
    const settings = settingsService.getSettings();
    if (settings.minimizeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Register global shortcut to show/hide window
  globalShortcut.register('Alt+Shift+T', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize all handlers
  initializeIpcHandlers();
  initializeSettingsHandlers();

  // Create tray immediately on app start
  if (!tray) {
    createTray();
  }

  try {
    // Initialize AI service
    const aiService = require('./services/aiService');
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
  
  // Start task checking service with immediate check
  taskService.startTaskChecking();
  
  // Test notification system on startup
  // setTimeout(() => {
  //   log.info('Testing notification system on startup');
  //   taskService.testNotification();
  // }, 5000); // Wait 5 seconds after startup
  
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
  
  // Register global shortcut (Ctrl+Shift+Space)
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        window.dispatchEvent(new Event('start-speech-recognition'));
      `);
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });
});

// Unregister shortcuts when app is quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // Stop task checking service
  taskService.stopTaskChecking();
  
  // Get minimize to tray setting
  const settings = settingsService.getSettings();
  const minimizeToTray = settings?.minimizeToTray;
  
  // On Windows/Linux, if minimize to tray is disabled, quit the app
  if (process.platform !== 'darwin' && !minimizeToTray) {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    app.quit();
  } else {
    // If minimize to tray is enabled, ensure tray exists
    if (!tray) {
      createTray();
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
