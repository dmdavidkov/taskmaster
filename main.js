// Optimize startup by requiring modules only when needed
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

console.time('app-startup');

// Initialize store
const store = new Store();
let mainWindow = null;

function createWindow() {
  console.time('window-creation');
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      spellcheck: false,
      v8CacheOptions: 'code'
    }
  });

  // Performance logging
  mainWindow.webContents.once('did-start-loading', () => {
    console.time('page-load');
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.timeEnd('page-load');
  });

  mainWindow.once('ready-to-show', () => {
    console.timeEnd('window-creation');
    mainWindow.show();
    console.timeEnd('app-startup');
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'build/index.html')}`;
  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Window controls
  ipcMain.handle('window-controls', (_, command) => {
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

  return mainWindow;
}

// Setup IPC handlers
const setupIpcHandlers = () => {
  // Task operations
  ipcMain.handle('get-tasks', () => {
    return store.get('tasks') || [];
  });

  ipcMain.handle('save-task', (_, task) => {
    const tasks = store.get('tasks') || [];
    const newTask = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set('tasks', [...tasks, newTask]);
    return newTask;
  });

  ipcMain.handle('update-task', (_, task) => {
    const tasks = store.get('tasks') || [];
    const updatedTasks = tasks.map(t => 
      t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t
    );
    store.set('tasks', updatedTasks);
    return task;
  });

  ipcMain.handle('toggle-task-completion', (_, taskId) => {
    const tasks = store.get('tasks') || [];
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const completed = !task.completed;
        return {
          ...task,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });
    store.set('tasks', updatedTasks);
    return updatedTasks.find(t => t.id === taskId);
  });

  ipcMain.handle('delete-task', (_, taskId) => {
    const tasks = store.get('tasks') || [];
    store.set('tasks', tasks.filter(t => t.id !== taskId));
  });
};

// Start app initialization
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();
});

// App lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
