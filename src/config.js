// Environment variables configuration
const getEnvVariable = (key) => {
    // Try different ways to access environment variables in Electron
    const value = window?.electron?.env?.[key] ||   // From preload script
                 window?.process?.env?.[key] ||      // Electron process
                 process?.env?.[key];                // Node process
    
    if (!value) {
        console.warn(`Environment variable ${key} not found`);
    }
    return value;
};

// Configuration object
export const config = {
    NEBIUS_API_KEY: getEnvVariable('REACT_APP_NEBIUS_API_KEY'),
    API_BASE_URL: 'https://api.studio.nebius.ai/v1/',
    isDevelopment: process?.env?.NODE_ENV === 'development',
};

// Validate required configuration
const validateConfig = () => {
    const required = ['NEBIUS_API_KEY'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        console.error(`Missing required configuration: ${missing.join(', ')}`);
        if (config.isDevelopment) {
            console.info('Development environment detected. Make sure your .env file is properly configured.');
        }
    }
};

validateConfig();
