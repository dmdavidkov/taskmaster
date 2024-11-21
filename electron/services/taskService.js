const { Notification, app } = require('electron');
const Store = require('electron-store');
const path = require('path');
const log = require('electron-log');
const { utcToZonedTime, format } = require('date-fns-tz');
const store = new Store();

class TaskService {
    constructor() {
        this.checkTimer = null;
        this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        log.info('TaskService initialized');
    }

    showNotification(title, body, taskId) {
        log.info('Showing notification:', { title, body, taskId });
        
        // Check notification settings
        const settings = store.get('settings');
        if (!settings || settings.notifications === 'none') {
            return;
        }

        // For important-only setting, check if the task is high priority
        if (settings.notifications === 'important') {
            const task = this.getTasks().find(t => t.id === taskId);
            if (!task || !task.priority || task.priority !== 'high') {
                return;
            }
        }
        
        // Create notification options with proper Windows settings
        const options = {
            title: title,
            body: body,
            icon: path.join(__dirname, '../../assets/icon.png'),
            silent: false,
            urgency: 'normal',
            timeoutType: 'default',
            // Add these Windows-specific options
            toastXml: undefined, // Let Windows handle the toast
            appId: process.platform === 'win32' ? 'com.taskmaster.app' : undefined // Must match the ID set in electron.js
        };

        // Create and show notification
        try {
            const notification = new Notification(options);
            
            // Add click handler to open app and show task
            notification.on('click', () => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    // If window was closed to tray, show it
                    if (!mainWindow.isVisible()) {
                        mainWindow.show();
                    }
                    // If window is minimized, restore it
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    // Focus the window
                    mainWindow.focus();
                    // Send event to show task after a short delay to ensure window is ready
                    setTimeout(() => {
                        mainWindow.webContents.send('show-task', taskId);
                    }, 100);
                }
            });

            notification.show();
            
            // Mark task as notified
            const tasks = this.getTasks();
            const updatedTasks = tasks.map(t => 
                t.id === taskId ? { ...t, notified: true } : t
            );
            store.set('tasks', updatedTasks);
        } catch (error) {
            log.error('Error showing notification:', error);
        }
    }

    getTasks() {
        return store.get('tasks') || [];
    }

    // Get tasks that are due exactly in the current minute
    getCurrentDueTasks() {
        const settings = store.get('settings');
        if (!settings || settings.notifications === 'none') {
            return [];
        }

        const now = new Date();
        const currentMinute = new Date(now);
        currentMinute.setSeconds(0);
        currentMinute.setMilliseconds(0);

        return this.getTasks().filter(task => {
            // Skip if task is completed, already notified, or has no due date
            if (!task.dueDate || task.completed || task.notified) {
                return false;
            }

            // For important-only setting, skip non-high-priority tasks
            if (settings.notifications === 'important' && (!task.priority || task.priority !== 'high')) {
                return false;
            }

            // Check if task is due exactly in the current minute
            const dueDate = utcToZonedTime(new Date(task.dueDate), this.userTimezone);
            dueDate.setSeconds(0);
            dueDate.setMilliseconds(0);
            return dueDate.getTime() === currentMinute.getTime();
        });
    }

    checkTasks() {
        const dueTasks = this.getCurrentDueTasks();
        
        dueTasks.forEach(task => {
            log.info('Task is due:', task.title);
            this.showNotification(task.title, 'This task is due now!', task.id);
        });
    }

    scheduleNextMinuteCheck() {
        const now = new Date();
        const nextMinute = new Date(now);
        nextMinute.setSeconds(0);
        nextMinute.setMilliseconds(0);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        
        const delay = nextMinute.getTime() - now.getTime();
        
        // Only log if debug logging is enabled
        if (process.env.NODE_ENV === 'development') {
            log.info('Scheduling next check at:', nextMinute.toISOString());
        }
        
        this.checkTimer = setTimeout(() => {
            this.checkTasks();
            this.scheduleNextMinuteCheck();
        }, delay);
    }

    startTaskChecking() {
        log.info('Starting task checking service');
        // Run an immediate check
        this.checkTasks();
        // Then schedule next checks
        this.scheduleNextMinuteCheck();
    }

    stopTaskChecking() {
        if (this.checkTimer) {
            log.info('Stopping task checking service');
            clearTimeout(this.checkTimer);
            this.checkTimer = null;
        }
    }

    addTask(task) {
        const tasks = this.getTasks();
        tasks.push(task);
        store.set('tasks', tasks);
        return task;
    }

    updateTask(updatedTask) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === updatedTask.id);
        if (index !== -1) {
            // Reset notification state if due date changed
            if (tasks[index].dueDate !== updatedTask.dueDate) {
                updatedTask.notified = false;
            }
            tasks[index] = updatedTask;
            store.set('tasks', tasks);
            return updatedTask;
        }
        throw new Error('Task not found');
    }

    deleteTask(taskId) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        store.set('tasks', filteredTasks);
        return taskId;
    }

    saveTasks(tasks) {
        store.set('tasks', tasks);
        return true;
    }

    completeTask(taskId) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        tasks[taskIndex] = {
            ...tasks[taskIndex],
            completed: true,
            completedDate: new Date().toISOString()
        };

        store.set('tasks', tasks);
        return tasks[taskIndex];
    }

    reopenTask(taskId) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        tasks[taskIndex] = {
            ...tasks[taskIndex],
            completed: false,
            completedDate: null,
            notified: false // Reset notification state when reopening
        };

        store.set('tasks', tasks);
        return tasks[taskIndex];
    }

    testNotification() {
        log.info('Testing notification system');
        this.showNotification('Example Task', 'This is a test task notification', 'test-task-id');
    }
}

module.exports = new TaskService();
