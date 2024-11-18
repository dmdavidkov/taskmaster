const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');
const store = new Store();

let mainWindow;
let updateCheckInProgress = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Configure logging only in development
if (isDev) {
  log.transports.file.level = 'debug';
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'debug';
}

// Get package.json for app version
const packageJson = require('../package.json');

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
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true,
      enableWebSQL: false,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheck'
    },
    backgroundColor: '#ffffff',
  });

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

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

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
app.whenReady().then(() => {
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
