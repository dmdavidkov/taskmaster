const Store = require('electron-store');
const { app } = require('electron');
const AutoLaunch = require('auto-launch');

const store = new Store();
const autoLauncher = new AutoLaunch({
    name: 'Task Master',
    path: app.getPath('exe'),
});

class SettingsService {
    constructor() {
        // Initialize default settings if they don't exist
        if (!store.get('settings')) {
            store.set('settings', {
                theme: 'system',
                notifications: 'all', // 'all', 'important', 'none'
                minimizeToTray: true,
                autoStart: false,
                startMinimized: true
            });
        }
    }

    getSettings() {
        return store.get('settings');
    }

    async setTheme(theme) {
        const settings = this.getSettings();
        store.set('settings', { ...settings, theme });
    }

    async setNotifications(level) {
        const settings = this.getSettings();
        store.set('settings', { ...settings, notifications: level });
    }

    async setMinimizeToTray(enabled) {
        const settings = this.getSettings();
        store.set('settings', { ...settings, minimizeToTray: enabled });
    }

    async setAutoStart(enabled) {
        const settings = this.getSettings();
        store.set('settings', { ...settings, autoStart: enabled });

        try {
            if (enabled) {
                await autoLauncher.setArguments(['--minimized']);
                await autoLauncher.enable();
            } else {
                await autoLauncher.disable();
            }
        } catch (error) {
            console.error('Error setting auto-start:', error);
        }
    }
}

module.exports = new SettingsService();
